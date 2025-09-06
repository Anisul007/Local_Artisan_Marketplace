import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { setAuthCookie, requireAuth } from "../middleware/auth.js";
import { ERR, isEmail, passwordStrong, isAuPhone } from "../utils/validators.js";
import { sendErr } from "../utils/errors.js";
import { sendMail } from "../utils/email.js";

const router = express.Router();

/* ----------------------------- Helpers ----------------------------- */
function signResetToken(payload) {
  const secret = process.env.RESET_JWT_SECRET || process.env.JWT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: "15m" });
}
function verifyResetToken(token) {
  const secret = process.env.RESET_JWT_SECRET || process.env.JWT_SECRET;
  return jwt.verify(token, secret);
}
function normalizeEmail(e = "") {
  return (e || "").toLowerCase().trim();
}

// Alphanumeric **UPPERCASE** OTP (for both verify + reset)
function generateOTP(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}

/* -------------------------------- REGISTER (with email OTP) -------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const body = req.body || {};
    const role = body.role;

    if (!role || !["customer", "vendor"].includes(role))
      return sendErr(res, 400, ERR.REQUIRED, "role required");

    const firstName = (body.firstName || "").trim();
    const lastName  = (body.lastName || "").trim();
    const email     = normalizeEmail(body.email);
    const username  = (body.username || "").trim() || undefined;
    const address   = (body.address || "").trim();

    if (!firstName || !lastName) return sendErr(res, 400, ERR.REQUIRED, "first/last name required");
    if (!email || !isEmail(email)) return sendErr(res, 400, ERR.INVALID_EMAIL, "invalid email");

    const exists = await User.findOne({ email });
    if (exists) return sendErr(res, 409, ERR.EMAIL_TAKEN, "email already registered");

    const password = body.password ?? "";
    const confirm  = body.confirm ?? body.confirmPassword ?? "";
    if (!passwordStrong(password)) return sendErr(res, 400, ERR.PASSWORD_WEAK, "weak password");
    if (password !== confirm) return sendErr(res, 400, ERR.PASSWORD_MISMATCH, "passwords do not match");

    const passwordHash = await bcrypt.hash(password, 10);

    const doc = {
      role,
      firstName,
      lastName,
      email,
      username,
      passwordHash,
      address,
      isVerified: false,
    };

    if (role === "customer") {
      const dob = body.dob ?? body.dateOfBirth;
      if (!dob) return sendErr(res, 400, ERR.REQUIRED, "dob required");
      doc.dob = new Date(dob);
    } else {
      const businessName = (body.businessName || "").trim();
      const phone        = (body.phone || "").trim();
      const website      = (body.website || "").trim();
      const description  = (body.description || "").trim();

      // NEW: accept multi-select primaryCategories; fall back to legacy primaryCategory
      let primaryCategories = Array.isArray(body.primaryCategories)
        ? body.primaryCategories
            .map((s) => String(s || "").trim())
            .filter(Boolean)
        : [];

      if (primaryCategories.length === 0) {
        const single = (body.primaryCategory || "").trim();
        if (single) primaryCategories = [single];
      }

      if (!businessName || !description || primaryCategories.length === 0)
        return sendErr(res, 400, ERR.REQUIRED, "vendor fields required");

      if (!phone || !isAuPhone(phone))
        return sendErr(res, 400, ERR.INVALID_PHONE_AU, "invalid AU phone");

      doc.vendor = { businessName, phone, website, description, primaryCategories };
    }

    // Create user (unverified)
    const user = await User.create(doc);

    // Generate & store **UPPERCASE alphanumeric** OTP (hashed) with 10 min expiry
    const code = generateOTP(6); // e.g. "AB3XZ7"
    user.verifyCodeHash = await bcrypt.hash(code, 10);
    user.verifyCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.lastVerifyEmailAt = new Date();
    await user.save();

    // Email the OTP via SMTP creds from .env
    await sendMail({
      to: user.email,
      subject: "Verify your Artisan Avenue account",
      text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`,
      html: `
        <p>Use this code to verify your email:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>
        <p>This code expires in <b>10 minutes</b>.</p>
      `,
    });

    // Do NOT set auth cookie yet; wait for verification
    return res.status(200).json({ ok: true, message: "Verification code sent to email." });
  } catch (err) {
    if (err?.code === 11000) {
      return sendErr(res, 409, ERR.EMAIL_TAKEN, "email already registered");
    }
    console.error("register error", err);
    return res.status(500).json({ ok: false, code: "ERR_SERVER" });
  }
});

/* --------------------------------- VERIFY EMAIL ---------------------------------- */
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return sendErr(res, 400, ERR.REQUIRED, "email/code required");

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return sendErr(res, 400, "ERR_NO_USER", "user not found");
    if (user.isVerified) {
      setAuthCookie(res, user.safe());
      return res.json({ ok: true, user: user.safe() });
    }

    if (!user.verifyCodeHash || !user.verifyCodeExpires || user.verifyCodeExpires < new Date()) {
      user.verifyCodeHash = undefined;
      user.verifyCodeExpires = undefined;
      await user.save();
      return sendErr(res, 400, "ERR_CODE_EXPIRED", "code expired");
    }

    // Compare with **UPPERCASE** version of code (we stored uppercase)
    const input = String(code || "").trim().toUpperCase();
    const ok = await bcrypt.compare(input, user.verifyCodeHash);
    if (!ok) return sendErr(res, 400, "ERR_CODE_INCORRECT", "incorrect code");

    // Success → mark verified & clear code, then sign-in
    user.isVerified = true;
    user.verifyCodeHash = undefined;
    user.verifyCodeExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await sendMail({
        to: user.email,
        subject: "Welcome to Artisan Avenue – Registration Confirmed",
        text: `Hi ${user.firstName}, your email has been verified successfully. Welcome aboard!`,
        html: `
          <p>Hi ${user.firstName},</p>
          <p>Your email has been verified successfully. 🎉</p>
          <p>Welcome to <b>Artisan Avenue</b>!</p>
        `,
      });
    } catch (e) {
      // non-fatal
      console.warn("verify-email confirmation mail failed:", e?.message || e);
    }

    setAuthCookie(res, user.safe());
    return res.json({ ok: true, user: user.safe() });
  } catch (err) {
    console.error("verify-email error", err);
    return res.status(500).json({ ok: false, code: "ERR_SERVER" });
  }
});

/* --------------------------------- RESEND OTP ---------------------------------- */
router.post("/verify-email/resend", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return sendErr(res, 400, ERR.REQUIRED, "email required");

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return res.json({ ok: true }); // don't leak
    if (user.isVerified) return res.json({ ok: true });

    // Throttle: allow resend every 60s
    if (user.lastVerifyEmailAt && Date.now() - user.lastVerifyEmailAt.getTime() < 60_000) {
      return res.json({ ok: true, message: "Please wait a minute before resending." });
    }

    const code = generateOTP(6); // uppercase alphanumeric
    user.verifyCodeHash = await bcrypt.hash(code, 10);
    user.verifyCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.lastVerifyEmailAt = new Date();
    await user.save();

    await sendMail({
      to: user.email,
      subject: "Your new Artisan Avenue verification code",
      text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`,
      html: `
        <p>Your new verification code:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>
        <p>This code expires in <b>10 minutes</b>.</p>
      `,
    });

    return res.json({ ok: true, message: "Verification code resent." });
  } catch (err) {
    console.error("verify-email/resend error", err);
    return res.status(500).json({ ok: false, code: "ERR_SERVER" });
  }
});

/* --------------------------------- LOGIN ---------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body || {};
    if (!user || !password) return sendErr(res, 400, ERR.REQUIRED, "user/password required");

    const query = user.includes("@") ? { email: user.toLowerCase() } : { username: user };
    const found = await User.findOne(query);
    if (!found) return sendErr(res, 401, ERR.AUTH_FAILED, "invalid credentials");

    const ok = await bcrypt.compare(password, found.passwordHash);
    if (!ok) return sendErr(res, 401, ERR.AUTH_FAILED, "invalid credentials");

    // direct login (no verified check, as requested)
    setAuthCookie(res, found.safe());
    return res.json({ ok: true, user: found.safe() });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ ok: false, code: "ERR_SERVER" });
  }
});

/* -------------------------------- LOGOUT ---------------------------------- */
router.post("/logout", (_req, res) => {
  res.clearCookie("aa_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" ? true : false,
    path: "/",
  });
  res.json({ ok: true });
});

/* ---------------------------------- ME ------------------------------------ */
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ ok: false });
  res.json({ ok: true, user: user.safe() });
});

/* ------------------------- FORGOT PASSWORD FLOW --------------------------- */
/**
 * 1) POST /api/auth/forgot/start
 *    Body: { email }
 *    Always returns { ok:true } to avoid user enumeration.
 *    Generates a **UPPERCASE alphanumeric** code, stores hash + expiry (10m), emails code.
 */
router.post("/forgot/start", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isEmail(email)) return res.json({ ok: true });

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return res.json({ ok: true });

    // simple throttle: 60s between requests
    const now = new Date();
    if (user.lastResetRequestAt && now - user.lastResetRequestAt < 60_000) {
      return res.json({ ok: true });
    }

    const code = generateOTP(6); // UPPERCASE alphanumeric
    const hash = await bcrypt.hash(code, 10);

    user.resetCodeHash = hash;
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    user.resetCodeAttempts = 0;
    user.lastResetRequestAt = now;
    await user.save();

    const subject = "Your Artisan Avenue reset code";
    const text = `Use this code to reset your password: ${code}\nThis code expires in 10 minutes.`;
    const html = `
      <p>Use this code to reset your password:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>
      <p>This code expires in <b>10 minutes</b>.</p>
    `;
    await sendMail({ to: user.email, subject, text, html });

    return res.json({ ok: true });
  } catch (err) {
    console.error("forgot/start error", err);
    return res.json({ ok: true }); // still hide details
  }
});

/**
 * 2) POST /api/auth/forgot/verify
 *    Body: { email, code }
 *    Returns: { ok:true, resetToken } on success.
 */
router.post("/forgot/verify", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return sendErr(res, 400, ERR.REQUIRED, "email/code required");

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user || !user.resetCodeHash || !user.resetCodeExpires) {
      return sendErr(res, 400, "ERR_NO_RESET_SESSION", "no reset session");
    }

    if (user.resetCodeExpires < new Date()) {
      user.resetCodeHash = undefined;
      user.resetCodeExpires = undefined;
      user.resetCodeAttempts = 0;
      await user.save();
      return sendErr(res, 400, "ERR_CODE_EXPIRED", "code expired");
    }

    if (user.resetCodeAttempts >= 5) {
      user.resetCodeHash = undefined;
      user.resetCodeExpires = undefined;
      await user.save();
      return sendErr(res, 429, "ERR_TOO_MANY_TRIES", "too many attempts");
    }

    // Compare against **UPPERCASE** input
    const input = String(code || "").trim().toUpperCase();
    const ok = await bcrypt.compare(input, user.resetCodeHash);
    if (!ok) {
      user.resetCodeAttempts += 1;
      await user.save();
      return sendErr(res, 400, "ERR_CODE_INCORRECT", "incorrect code");
    }

    // success → issue short-lived reset token & clear code
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    user.resetCodeAttempts = 0;
    await user.save();

    const token = signResetToken({ id: user._id, email: user.email, purpose: "reset" });
    return res.json({ ok: true, resetToken: token });
  } catch (err) {
    console.error("forgot/verify error", err);
    return res.status(500).json({ ok: false, code: "ERR_SERVER" });
  }
});

/**
 * 3) POST /api/auth/forgot/reset
 *    Body: { email, resetToken, password, confirm }
 */
router.post("/forgot/reset", async (req, res) => {
  try {
    const { email, resetToken, password, confirm } = req.body || {};
    if (!email || !resetToken || !password || !confirm)
      return sendErr(res, 400, ERR.REQUIRED, "missing fields");

    if (!passwordStrong(password))
      return sendErr(res, 400, ERR.PASSWORD_WEAK, "weak password");

    if (password !== confirm)
      return sendErr(res, 400, ERR.PASSWORD_MISMATCH, "passwords do not match");

    let payload;
    try {
      payload = verifyResetToken(resetToken);
    } catch {
      return sendErr(res, 401, "ERR_BAD_RESET_TOKEN", "invalid/expired token");
    }

    const user = await User.findOne({ _id: payload.id, email: normalizeEmail(email) });
    if (!user) return sendErr(res, 400, "ERR_NO_USER", "user not found");

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    res.clearCookie("aa_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("forgot/reset error", err);
    return res.status(500).json({ ok: false, code: "ERR_SERVER" });
  }
});

export default router;


