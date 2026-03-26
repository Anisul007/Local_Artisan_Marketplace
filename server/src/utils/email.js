// server/src/utils/email.js
import nodemailer from "nodemailer";

// Support both SMTP_* and MAIL_* (e.g. .env.example used MAIL_*)
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

let transporter = null;
let usingEthereal = false;
let setupFailed = false;

async function buildTransporter() {
  if (setupFailed) return;

  if (host && user && pass) {
    // Mailtrap sandbox works best on 2525; default for mailtrap host
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
      console.log(`[mail] SMTP ready on ${host}:${portNum}`);
      return;
    } catch (err) {
      console.warn("[mail] SMTP verify failed:", err?.message || err);
      transporter = null;
    }
    if (transporter) return;
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
    console.log("[mail] Using Ethereal dev account:", testAcc.user);
  } catch (err) {
    console.warn("[mail] No SMTP configured and Ethereal unavailable:", err?.message || err);
    console.warn("[mail] Set SMTP_HOST, SMTP_USER, SMTP_PASS (or MAIL_HOST, MAIL_USER, MAIL_PASS) in server/.env for Mailtrap etc.");
    setupFailed = true;
  }
}

/** Call at startup to verify SMTP and log status (optional). */
export async function verifyMailConfig() {
  if (!transporter && !setupFailed) await buildTransporter();
  return !!transporter;
}

export async function sendMail({ to, subject, html, text }) {
  if (!transporter && !setupFailed) await buildTransporter();
  if (!transporter) {
    console.warn("[mail] Skipped (no transporter):", subject, "->", to);
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log("[mail] Sent:", info.messageId);
    if (usingEthereal) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log("[mail] Preview:", url);
    }
    return info;
  } catch (err) {
    console.error("[mail] Send failed:", err?.message || err);
    return null;
  }
}

