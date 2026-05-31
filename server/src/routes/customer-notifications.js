import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import {
  buildCustomerNotificationFeed,
  markCustomerNotificationsSeen,
} from "../utils/customer-notifications.js";

const router = Router();

function requireCustomer(req, res, next) {
  if (req.user?.role !== "customer") {
    return res.status(403).json({ ok: false, message: "Customer access only" });
  }
  next();
}

router.use(requireAuth, requireCustomer);

router.get("/notifications", async (req, res, next) => {
  try {
    const customerId = req.user?._id || req.user?.id;
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ ok: false, message: "Invalid customer id" });
    }
    const feed = await buildCustomerNotificationFeed(customerId);
    return res.json({ ok: true, data: feed });
  } catch (e) {
    next(e);
  }
});

router.get("/notifications/summary", async (req, res, next) => {
  try {
    const customerId = req.user?._id || req.user?.id;
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ ok: false, message: "Invalid customer id" });
    }
    const feed = await buildCustomerNotificationFeed(customerId);
    return res.json({ ok: true, data: feed.summary });
  } catch (e) {
    next(e);
  }
});

router.post("/notifications/mark-seen", async (req, res, next) => {
  try {
    const customerId = req.user?._id || req.user?.id;
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ ok: false, message: "Invalid customer id" });
    }
    const at = await markCustomerNotificationsSeen(customerId);
    return res.json({ ok: true, data: { notificationsLastSeenAt: at } });
  } catch (e) {
    next(e);
  }
});

export default router;
