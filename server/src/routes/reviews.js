import { Router } from "express";
import Review from "../models/Review.js";
import Listing from "../models/Listing.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Vendor can view reviews for their own listings
router.get("/", requireAuth, async (req, res, next) => {
  try {
    if (req?.user?.role !== "vendor") return res.status(403).json({ message: "Vendor access only" });

    const { productId = "", rating = "", page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const ownedQuery = { vendor: req.user.id || req.user._id };
    if (productId) ownedQuery._id = productId;

    const owned = await Listing.find(ownedQuery).select("_id").lean();
    const ids = owned.map(p => p._id);
    if (!ids.length) return res.json({ ok: true, data: { items: [], pagination: { page: pageNum, limit: pageSize, total: 0, pages: 0 } } });

    const q = { productId: { $in: ids } };
    if (rating) q.rating = Number(rating);

    const [items, total] = await Promise.all([
      Review.find(q).sort({ createdAt: -1 }).skip((pageNum - 1) * pageSize).limit(pageSize).lean(),
      Review.countDocuments(q),
    ]);

    res.json({ ok: true, data: { items, pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) } } });
  } catch (e) { next(e); }
});

export default router;
