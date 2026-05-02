import { Router } from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { sendErr } from "../utils/errors.js";
import { ERR, isAuPhone, isEmail } from "../utils/validators.js";

const router = Router();

function requireAdmin(req, res, next) {
  if (req?.user?.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Admin access only" });
  }
  next();
}

router.get("/profile", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ ok: false, message: "Admin user not found" });
    return res.json({
      ok: true,
      data: {
        id: user._id,
        role: user.role,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        adminProfile: user.adminProfile || {},
      },
    });
  } catch (e) {
    next(e);
  }
});

router.put("/profile", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ ok: false, message: "Admin user not found" });

    const firstName = req.body?.firstName !== undefined ? String(req.body.firstName || "").trim() : user.firstName;
    const lastName = req.body?.lastName !== undefined ? String(req.body.lastName || "").trim() : user.lastName;
    const email = req.body?.email !== undefined ? String(req.body.email || "").trim().toLowerCase() : user.email;
    const phone = req.body?.phone !== undefined ? String(req.body.phone || "").trim() : String(user.adminProfile?.phone || "");
    const department = req.body?.department !== undefined ? String(req.body.department || "").trim() : String(user.adminProfile?.department || "");
    const bio = req.body?.bio !== undefined ? String(req.body.bio || "").trim() : String(user.adminProfile?.bio || "");
    const displayName = req.body?.displayName !== undefined
      ? String(req.body.displayName || "").trim()
      : String(user.adminProfile?.displayName || "");

    if (!firstName || !lastName) return sendErr(res, 400, ERR.REQUIRED, "first/last name required");
    if (!email || !isEmail(email)) return sendErr(res, 400, ERR.INVALID_EMAIL, "invalid email");
    if (phone && !isAuPhone(phone)) return sendErr(res, 400, ERR.INVALID_PHONE_AU, "invalid AU phone");

    const duplicate = await User.findOne({ email, _id: { $ne: user._id } }).lean();
    if (duplicate) return sendErr(res, 409, ERR.EMAIL_TAKEN, "email already registered");

    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.adminProfile = {
      ...(user.adminProfile?.toObject?.() || user.adminProfile || {}),
      displayName,
      phone,
      department,
      bio,
    };
    await user.save();

    return res.json({
      ok: true,
      message: "Admin profile updated",
      user: user.safe(),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
