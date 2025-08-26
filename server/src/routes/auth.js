import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { setAuthCookie, requireAuth } from "../middleware/auth.js";
import { ERR, isEmail, passwordStrong, isAuPhone } from "../utils/validators.js";
import { sendErr } from "../utils/errors.js";
import { sendMail } from "../utils/email.js";

const router = express.Router();

/* ------------------------ Auth helpers (reset token) ----------------------- */
function signResetToken(payload) {
  const secret = process.env.RESET_JWT_SECRET || process.env.JWT_SECRET;
  return jwt.sign(payload, secret, { expiresIn: "15m" });
}
function verifyResetToken(token) {
  const secret = process.env.RESET_JWT_SECRET || process.env.JWT_SECRET;
  return jwt.verify(token, secret);
}

/* -------------------------------- REGISTER -------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const body = req.body || {};
    const role = body.role;

    if (!role || !["customer", "vendor"].includes(role))
      return sendErr(res, 400, ERR.REQUIRED, "role required");

    const firstName = (body.firstName || "").trim();
    const lastName  = (body.lastName || "").trim();
    const email     = (body.email || "").toLowerCase().trim();
    const username  = (body.username || "").trim() || undefined;
    const address   = (body.address || "").trim();

    if (!firstName || !lastName) return sendErr(res, 400, ERR.REQUIRED, "first/last name required");
    if (!email || !isEmail(email)) return sendErr(res, 400, ERR.INVALID_EMAIL, "invalid email");

    const exists = await User.findOne({ email });
    if (exists) return sendErr(res, 409, ERR.EMAIL_TAKEN, "email already registered");

    const password = body.password ?? "";
    const confirm  = body.confirm ?? "";
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
      address
    };

    if (role === "customer") {
      if (!body.dob) return sendErr(res, 400, ERR.REQUIRED, "dob required");
      doc.dob = new Date(body.dob);
    } else {
      const businessName   = (body.businessName || "").trim();
      const phone          = (body.phone || "").trim();
      const website        = (body.website || "").trim();
      const description    = (body.description || "").trim();
      const primaryCategory= (body.primaryCategory || "").trim();

      if (!businessName || !description || !primaryCategory)
        return sendErr(res, 400, ERR.REQUIRED, "vendor fields required");

      if (!phone || !isAuPhone(phone))
        return sendErr(res, 400, ERR.INVALID_PHONE_AU, "invalid AU phone");

      doc.vendor = { businessName, phone, website, description, primaryCategory };
    }

    const user = await User.create(doc);
    setAuthCookie(res, user.safe());
    return res.status(201).json({ ok: true, user: user.safe() });
  } catch (err) {
    if (err?.code === 11000) {
      return sendErr(res, 409, ERR.EMAIL_TAKEN, "email already registered");
    }
    console.error("register error", err);
    return res.status(500).json({ ok: false, code: "ERR_SERVER" });
  }
});

/* --------------------------------- LOGIN ---------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { user, password } = req.body || {};
    if (!user || !password)
      return sendErr(res, 400, ERR.REQUIRED, "user/password required");

    const query = user.includes("@") ? { email: user.toLowerCase() } : { username: user };
    const found = await User.findOne(query);
    if (!found) return sendErr(res, 401, ERR.AUTH_FAILED, "invalid credentials");

    const ok = await bcrypt.compare(password, found.passwordHash);
    if (!ok) return sendErr(res, 401, ERR.AUTH_FAILED, "invalid credentials");

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
    secure: process.env.NODE_ENV === "production" ? true : false, // 👈 important
    path: "/",   // 👈 also include path so it clears correctly
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
 *    Generates a 6-digit code, stores bcrypt hash + expiry (10m), emails code.
 */
router.post("/forgot/start", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isEmail(email)) return res.json({ ok: true });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ ok: true });

    // simple throttle: 60s between requests
    const now = new Date();
    if (user.lastResetRequestAt && now - user.lastResetRequestAt < 60_000) {
      return res.json({ ok: true });
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString(); // 6 digits
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
    // still return ok to avoid leaking info
    return res.json({ ok: true });
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

    const user = await User.findOne({ email: email.toLowerCase() });
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

    const ok = await bcrypt.compare(code, user.resetCodeHash);
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
 *    On success: { ok:true }
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

    const user = await User.findOne({ _id: payload.id, email: email.toLowerCase() });
    if (!user) return sendErr(res, 400, "ERR_NO_USER", "user not found");

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    // clear session cookie if any
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

