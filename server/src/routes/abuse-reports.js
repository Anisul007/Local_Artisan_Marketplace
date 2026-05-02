import { Router } from "express";
import AbuseReport from "../models/AbuseReport.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    const details = String(req.body?.details || "").trim();
    const targetType = String(req.body?.targetType || "other").trim().toLowerCase();
    const targetId = String(req.body?.targetId || "").trim();
    const reporterName = String(req.body?.reporterName || "").trim();
    const reporterEmail = String(req.body?.reporterEmail || "").trim();
    if (!reason) return res.status(400).json({ ok: false, message: "reason is required" });

    const validTarget = ["listing", "vendor", "order", "other"].includes(targetType) ? targetType : "other";
    const reporter = req.user?.id || req.user?._id || null;
    const doc = await AbuseReport.create({
      reporter,
      reporterName,
      reporterEmail,
      targetType: validTarget,
      targetId,
      reason,
      details,
      status: "new",
    });
    return res.status(201).json({ ok: true, message: "Report submitted. Thank you.", data: { id: doc._id } });
  } catch (e) {
    next(e);
  }
});

export default router;
