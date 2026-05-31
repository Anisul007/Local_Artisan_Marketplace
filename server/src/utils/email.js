// server/src/utils/email.js
import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";

// Support both SMTP_* and MAIL_* (e.g. .env used MAIL_*)
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
} = process.env;

const host = SMTP_HOST || MAIL_HOST;
const port = SMTP_PORT || MAIL_PORT;
const user = SMTP_USER || MAIL_USER;
const pass = SMTP_PASS || MAIL_PASS;
const from = process.env.SMTP_FROM || MAIL_FROM || "Artisan Avenue <no-reply@artisan-avenue.local>";
const secureFlag = process.env.MAIL_SECURE || process.env.SMTP_SECURE;

const smtpFullyConfigured = !!(String(host || "").trim() && String(user || "").trim() && String(pass || "").trim());

/** Min ms between SMTP sends for real providers (Mailtrap free = ~1 msg/s). Set 0 to disable. */
function minSendIntervalMs() {
  const n = Number(process.env.MAIL_MIN_SEND_INTERVAL_MS);
  if (Number.isFinite(n) && n >= 0) return n;
  return smtpFullyConfigured ? 1200 : 0;
}

let transporter = null;
let usingEthereal = false;
let setupFailed = false;
let warnedBadSmtp = false;
let realSmtpVerifyFailed = false;
/** Next time (epoch ms) a new SMTP send may start (rate limit friendly). */
let nextSendSlotAt = 0;
/** Serialize all sendMail calls so spacing + retries stay ordered (customer then vendors). */
let mailQueue = Promise.resolve();

async function writeMailPreview({ to, subject, text, html }) {
  const dir = String(process.env.MAIL_PREVIEW_DIR || "").trim();
  if (!dir) return;
  try {
    await fs.mkdir(dir, { recursive: true });
    const stamp = Date.now();
    const safeSub = String(subject || "mail")
      .replace(/[^a-z0-9-_]+/gi, "_")
      .slice(0, 60);
    const baseDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    const base = path.join(baseDir, `${stamp}-${safeSub}`);
    await fs.writeFile(`${base}.txt`, `To: ${to}\nSubject: ${subject}\n\n${text || ""}`, "utf8");
    if (html) await fs.writeFile(`${base}.html`, html, "utf8");
    console.log("[mail] Preview files:", `${base}.html`);
  } catch (err) {
    console.warn("[mail] MAIL_PREVIEW_DIR write failed:", err?.message || err);
  }
}

async function buildTransporter() {
  if (setupFailed) return;

  if (smtpFullyConfigured) {
    if (realSmtpVerifyFailed) return;
    const defaultPort = /mailtrap\.io/i.test(host) ? 2525 : 587;
    const portNum = Number(port) || defaultPort;
    const secure = secureFlag === "true" || portNum === 465;

    transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure,
      auth: { user, pass },
    });

    try {
      await transporter.verify();
      usingEthereal = false;
      console.log(`[mail] SMTP ready on ${host}:${portNum}`);
      if (minSendIntervalMs() > 0) {
        console.log(
          `[mail] Sending is serialized with ~${minSendIntervalMs()}ms between messages (MAIL_MIN_SEND_INTERVAL_MS). Helps Mailtrap free-tier limits.`
        );
      }
      return;
    } catch (err) {
      realSmtpVerifyFailed = true;
      console.error(
        "[mail] SMTP credentials are set but connection/verify FAILED — emails will not send until fixed:",
        err?.message || err
      );
      console.error("[mail] Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (firewall, app password, TLS).");
      transporter = null;
      if (!warnedBadSmtp) {
        warnedBadSmtp = true;
        console.error("[mail] Not falling back to Ethereal while SMTP_* is configured (would hide misconfiguration).");
      }
      return;
    }
  }

  try {
    const testAcc = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAcc.user, pass: testAcc.pass },
    });
    usingEthereal = true;
    console.warn(
      "[mail] No complete SMTP_* / MAIL_* in .env — using Ethereal (fake inbox). Messages do NOT reach real addresses."
    );
    console.warn("[mail] Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS for real delivery (e.g. Mailtrap).");
    console.warn('[mail] Optional: MAIL_PREVIEW_DIR=./.mail-previews saves .html copies of every send.');
    console.log("[mail] Ethereal dev account:", testAcc.user);
  } catch (err) {
    console.warn("[mail] No SMTP configured and Ethereal unavailable:", err?.message || err);
    console.warn("[mail] Set SMTP_HOST, SMTP_USER, SMTP_PASS (or MAIL_HOST, MAIL_USER, MAIL_PASS) in server/.env.");
    setupFailed = true;
  }
}

function isRateLimitError(err) {
  const msg = String(err?.response || err?.message || err || "");
  return /550|too many emails|rate limit|per second/i.test(msg);
}

async function throttleBeforeSend() {
  const gap = usingEthereal ? 0 : minSendIntervalMs();
  if (gap <= 0) return;
  const now = Date.now();
  const wait = Math.max(0, nextSendSlotAt - now);
  if (wait > 50) console.log(`[mail] Throttle ${wait}ms (provider rate limits / MAIL_MIN_SEND_INTERVAL_MS)`);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

function markSendComplete() {
  const gap = usingEthereal ? 0 : minSendIntervalMs();
  if (gap > 0) nextSendSlotAt = Date.now() + gap;
}

/** Call at startup to verify SMTP and log status (optional). */
export async function verifyMailConfig() {
  if (!transporter && !setupFailed) await buildTransporter();
  return !!transporter;
}

/**
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]
 * @param {string} [opts.replyTo]
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
  const job = mailQueue.then(() => runSendMail({ to, subject, html, text, replyTo }));
  mailQueue = job.catch(() => {}).then(() => undefined);
  return job;
}

async function runSendMail({ to, subject, html, text, replyTo }) {
  await writeMailPreview({ to, subject, text, html });

  if (!transporter && !setupFailed) await buildTransporter();
  if (!transporter) {
    console.warn("[mail] Skipped (no transporter):", subject, "->", to);
    return null;
  }

  const doSend = async () => {
    await throttleBeforeSend();
    return transporter.sendMail({
      from,
      to,
      replyTo: replyTo && String(replyTo).trim() ? String(replyTo).trim() : undefined,
      subject,
      text,
      html,
    });
  };

  try {
    let info;
    try {
      info = await doSend();
    } catch (err) {
      if (isRateLimitError(err) && smtpFullyConfigured && !usingEthereal) {
        const backoff = Number(process.env.MAIL_RATE_LIMIT_BACKOFF_MS || 2800);
        console.warn("[mail] Provider rate limited; waiting", backoff, "ms then retrying once...");
        await new Promise((r) => setTimeout(r, backoff));
        nextSendSlotAt = Date.now() + minSendIntervalMs();
        info = await doSend();
      } else {
        throw err;
      }
    }
    markSendComplete();
    console.log("[mail] Sent:", subject, "->", to, info.messageId || "");
    if (usingEthereal) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log("[mail] Preview URL (open in browser):", url);
    }
    return info;
  } catch (err) {
    markSendComplete();
    console.error("[mail] Send failed:", subject, "->", to, err?.message || err);
    return null;
  }
}
