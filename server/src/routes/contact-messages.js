import { Router } from "express";
import ContactMessage from "../models/ContactMessage.js";
import { sendMail } from "../utils/email.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const message = String(req.body?.message || "").trim();
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, message: "name, email, and message are required" });
    }
    const doc = await ContactMessage.create({ name, email, message, status: "new" });
    return res.status(201).json({ ok: true, message: "Your message has been submitted.", data: { id: doc._id } });
  } catch (e) {
    next(e);
  }
});

// optional user reply acknowledgement endpoint
router.post("/:id/reply-received", async (req, res, next) => {
  try {
    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export async function notifyContactResolved(contact, responseText) {
  if (!contact?.email) return;
  await sendMail({
    to: contact.email,
    subject: "Response to your Artisan Avenue contact request",
    text: `Hi ${contact.name || "there"},\n\n${responseText}\n\nWe've marked your request as resolved. Reply any time if you need more help.`,
    html: `<p>Hi ${contact.name || "there"},</p><p>${responseText}</p><p>We've marked your request as resolved. Reply any time if you need more help.</p>`,
  });
}

export default router;
