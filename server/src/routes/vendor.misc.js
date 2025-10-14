import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Listing from "../models/Listing.js";

const router = Router();

// GET /api/vendor/summary
router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const vendor = req.user._id || req.user.id;
    const active = await Listing.countDocuments({ vendor, "inventory.status": "active" });
    res.json({ ok: true, revenueToday: 0, orders: 0, conversion: 0, aov: 0, listingsActive: active });
  } catch (e) { next(e); }
});

// GET /api/vendor/products?limit=6
router.get("/products", requireAuth, async (req, res, next) => {
  try {
    const vendor = req.user._id || req.user.id;
    const limit = Math.min(parseInt(req.query.limit || "6", 10), 24);
    const items = await Listing.find({ vendor, archivedAt: { $in: [null, undefined] } })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    const mapped = items.map((l) => ({
      _id: l._id,
      name: l.title,
      price: (l?.pricing?.priceCents || 0) / 100,
      stock: l?.inventory?.stockQty ?? 0,
      imageUrl: (l.images || []).find((i) => i?.isPrimary)?.url || (l.images || [])[0]?.url || "",
    }));
    res.json({ ok: true, items: mapped });
  } catch (e) { next(e); }
});

// GET /api/vendor/orders?limit=5
router.get("/orders", requireAuth, async (req, res) => {
  res.json({ ok: true, items: [] }); // wire to real Order model later
});

export default router;
