import { Router } from "express";
import mongoose from "mongoose";
import AbuseReport from "../models/AbuseReport.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const TARGET_TYPES = ["listing", "vendor", "order", "customer", "other"];

function reporterRoleFromUser(user) {
  const role = String(user?.role || "").toLowerCase();
  if (role === "customer" || role === "vendor" || role === "admin") return role;
  return "other";
}

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    const details = String(req.body?.details || "").trim();
    const targetType = String(req.body?.targetType || "other").trim().toLowerCase();
    const targetId = String(req.body?.targetId || "").trim();
    const targetLabel = String(req.body?.targetLabel || "").trim();
    if (!reason) return res.status(400).json({ ok: false, message: "Please select or enter a reason." });

    const validTarget = TARGET_TYPES.includes(targetType) ? targetType : "other";
    if (validTarget !== "other" && !targetId) {
      return res.status(400).json({ ok: false, message: "Reference ID is required for this report type." });
    }
    if (targetId && !mongoose.Types.ObjectId.isValid(targetId) && validTarget !== "other") {
      return res.status(400).json({ ok: false, message: "Invalid reference ID." });
    }

    const uid = req.user?.id || req.user?._id;
    const reporter = await User.findById(uid).select("firstName lastName email role").lean();
    if (!reporter) return res.status(401).json({ ok: false, message: "User not found" });

    const reporterName = [reporter.firstName, reporter.lastName].filter(Boolean).join(" ").trim() || reporter.email || "";
    const doc = await AbuseReport.create({
      reporter: uid,
      reporterName,
      reporterEmail: reporter.email || "",
      reporterRole: reporterRoleFromUser(reporter),
      targetType: validTarget,
      targetId,
      targetLabel,
      reason,
      details,
      status: "new",
    });
    return res.status(201).json({ ok: true, message: "Report submitted. Our team will review it.", data: { id: doc._id } });
  } catch (e) {
    next(e);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user?.id || req.user?._id;
    const items = await AbuseReport.find({ reporter: uid }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

export default router;
