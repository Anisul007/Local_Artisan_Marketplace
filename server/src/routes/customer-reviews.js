import { Router } from "express";
import Review from "../models/Review.js";
import { requireAuth } from "../middleware/auth.js";
import {
  findDeliveredOrderWithListing,
  getCustomerReviewEligibility,
} from "../utils/review-eligibility.js";

const router = Router();

const PUBLIC_REVIEW_FILTER = {
  verifiedPurchase: true,
  moderationStatus: { $ne: "rejected" },
};

function mapPublicReview(r) {
  return {
    _id: r._id,
    rating: r.rating,
    comment: r.comment,
    verifiedPurchase: r.verifiedPurchase,
    createdAt: r.createdAt,
    customerName: r.customerId ? `${r.customerId.firstName || ""}***`.trim() : "Customer",
  };
}

// GET /api/customer/reviews/eligibility?listingId= — can logged-in customer review?
router.get("/eligibility", requireAuth, async (req, res, next) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    const role = req.user?.role;
    if (role === "vendor") {
      return res.json({
        ok: true,
        data: { canReview: false, hasReviewed: false, reason: "vendor_account" },
      });
    }

    const listingId = req.query.listingId || req.query.productId;
    if (!listingId) {
      return res.status(400).json({ ok: false, message: "listingId required" });
    }

    const eligibility = await getCustomerReviewEligibility(customerId, listingId);
    return res.json({ ok: true, data: eligibility });
  } catch (e) {
    next(e);
  }
});

// POST /api/customer/reviews — create a review (delivered orders only)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    const role = req.user?.role;
    if (role === "vendor") {
      return res.status(403).json({ ok: false, message: "Vendors cannot review products" });
    }

    const { productId, listingId, rating, comment = "" } = req.body || {};
    const listingIdResolved = productId || listingId;
    if (!listingIdResolved) {
      return res.status(400).json({ ok: false, message: "productId or listingId required" });
    }
    const ratingNum = Math.min(5, Math.max(1, Math.floor(Number(rating)) || 0));
    if (!ratingNum) return res.status(400).json({ ok: false, message: "rating 1–5 required" });

    const existing = await Review.findOne({ productId: listingIdResolved, customerId }).lean();
    if (existing) {
      return res.status(409).json({ ok: false, message: "You have already reviewed this product" });
    }

    const delivered = await findDeliveredOrderWithListing(customerId, listingIdResolved);
    if (!delivered) {
      return res.status(403).json({
        ok: false,
        message: "You can review this product after your order has been delivered.",
      });
    }

    const review = await Review.create({
      productId: listingIdResolved,
      customerId,
      rating: ratingNum,
      comment: String(comment).trim().slice(0, 2000),
      verifiedPurchase: true,
    });

    return res.status(201).json({ ok: true, data: review });
  } catch (e) {
    next(e);
  }
});

// GET /api/customer/reviews?listingId= — verified buyer reviews for product page
router.get("/", async (req, res, next) => {
  try {
    const { listingId, productId, page = "1", limit = "10" } = req.query;
    const id = listingId || productId;
    if (!id) return res.status(400).json({ ok: false, message: "listingId required" });

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const filter = { productId: id, ...PUBLIC_REVIEW_FILTER };

    const [items, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("customerId", "firstName")
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.json({
      ok: true,
      data: {
        items: items.map(mapPublicReview),
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
