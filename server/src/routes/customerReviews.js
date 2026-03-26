import { Router } from "express";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/customer/reviews — create a review (customer, optional verifiedPurchase)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    const role = req.user?.role;
    if (role === "vendor") return res.status(403).json({ ok: false, message: "Vendors submit reviews from their dashboard" });

    const { productId, listingId, rating, comment = "" } = req.body || {};
    const listingIdResolved = productId || listingId;
    if (!listingIdResolved) return res.status(400).json({ ok: false, message: "productId or listingId required" });
    const ratingNum = Math.min(5, Math.max(1, Math.floor(Number(rating)) || 0));
    if (!ratingNum) return res.status(400).json({ ok: false, message: "rating 1–5 required" });

    const existing = await Review.findOne({ productId: listingIdResolved, customerId }).lean();
    if (existing) return res.status(409).json({ ok: false, message: "You have already reviewed this product" });

    let verifiedPurchase = false;
    const delivered = await Order.findOne({
      customer: customerId,
      status: "delivered",
      "items.listing": listingIdResolved,
    }).lean();
    if (delivered) verifiedPurchase = true;

    const review = await Review.create({
      productId: listingIdResolved,
      customerId,
      rating: ratingNum,
      comment: String(comment).trim().slice(0, 2000),
      verifiedPurchase,
    });

    return res.status(201).json({ ok: true, data: review });
  } catch (e) {
    next(e);
  }
});

// GET /api/customer/reviews?listingId= — list reviews for a listing (for product page)
router.get("/", async (req, res, next) => {
  try {
    const { listingId, productId, page = "1", limit = "10" } = req.query;
    const id = listingId || productId;
    if (!id) return res.status(400).json({ ok: false, message: "listingId required" });

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const [items, total] = await Promise.all([
      Review.find({ productId: id }).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).populate("customerId", "firstName").lean(),
      Review.countDocuments({ productId: id }),
    ]);

    const safe = items.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt,
      customerName: r.customerId ? `${r.customerId.firstName || ""}***`.trim() : "Customer",
    }));

    return res.json({ ok: true, data: { items: safe, total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (e) {
    next(e);
  }
});

export default router;
