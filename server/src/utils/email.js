// server/src/utils/email.js
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = "Artisan Avenue <no-reply@artisan-avenue.local>",
  MAIL_SECURE, // optional: "true" to use SMTPS/465
} = process.env;

let transporter;
let usingEthereal = false;

async function buildTransporter() {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    // Real SMTP (Mailtrap, Gmail App Password, etc.)
    const port = Number(SMTP_PORT) || 587;
    const secure = MAIL_SECURE === "true" || port === 465; // SMTPS if 465 or explicitly set

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    try {
      await transporter.verify();
      console.log(`[mail] SMTP ready on ${SMTP_HOST}:${port} (secure=${secure})`);
      return;
    } catch (err) {
      console.error("[mail] SMTP verify failed:", err?.message || err);
      console.error("[mail] Falling back to Ethereal dev inbox.");
      await setupEthereal();
      return;
    }
  }

  await setupEthereal();
}

async function setupEthereal() {
  usingEthereal = true;
  const testAcc = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAcc.user, pass: testAcc.pass },
  });
  console.log("[mail] Using Ethereal development account");
  console.log(`[mail] Ethereal user: ${testAcc.user}`);
}

export async function sendMail({ to, subject, html, text }) {
  if (!transporter) await buildTransporter();

  const info = await transporter.sendMail({
    from: SMTP_FROM,
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
}

