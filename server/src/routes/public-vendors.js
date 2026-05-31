import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import VendorProfile from "../models/VendorProfile.js";
import Listing from "../models/Listing.js";
import Review from "../models/Review.js";

const router = Router();

// GET /api/vendors — featured vendors for marketing pages
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10) || 12, 1), 50);
    const users = await User.find({ role: "vendor", isActive: { $ne: false } })
      .select("_id firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit * 3)
      .lean();

    const ids = users.map((u) => u._id);
    if (!ids.length) {
      return res.json({ ok: true, data: { items: [] } });
    }

    const [profiles, productCounts] = await Promise.all([
      VendorProfile.find({ user: { $in: ids } }).lean(),
      Listing.aggregate([
        {
          $match: {
            vendor: { $in: ids },
            "inventory.status": "active",
            $or: [{ "moderation.status": "approved" }, { moderation: { $exists: false } }],
          },
        },
        { $group: { _id: "$vendor", products: { $sum: 1 } } },
      ]),
    ]);

    const profileMap = Object.fromEntries(profiles.map((p) => [p.user.toString(), p]));
    const countMap = Object.fromEntries(productCounts.map((c) => [c._id.toString(), c.products]));

    const items = users
      .map((u) => {
        const id = u._id.toString();
        const profile = profileMap[id];
        const businessName =
          profile?.businessName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Vendor";
        return {
          id,
          businessName,
          logoUrl: profile?.logoUrl || "",
          bio: profile?.bio || "",
          website: profile?.website || "",
          primaryCategories: profile?.primaryCategories || [],
          address: profile?.address || {},
          stats: { products: countMap[id] || 0 },
        };
      })
      .sort((a, b) => Number(b.stats.products) - Number(a.stats.products))
      .slice(0, limit);

    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

// GET /api/vendors/:id — public vendor storefront profile
router.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }

    const [user, profile, counts] = await Promise.all([
      User.findById(id).select("_id firstName lastName role").lean(),
      VendorProfile.findOne({ user: id }).lean(),
      Listing.aggregate([
        { $match: { vendor: new mongoose.Types.ObjectId(id), "inventory.status": "active" } },
        { $group: { _id: null, products: { $sum: 1 } } },
      ]),
    ]);

    if (!user || user.role !== "vendor") {
      return res.status(404).json({ ok: false, message: "Vendor not found" });
    }

    const businessName =
      profile?.businessName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Vendor";

    return res.json({
      ok: true,
      data: {
        id,
        businessName,
        logoUrl: profile?.logoUrl || "",
        brandColor: profile?.brandColor || "#6d28d9",
        bio: profile?.bio || "",
        website: profile?.website || "",
        contactEmail: profile?.contactEmail || "",
        phone: profile?.phone || "",
        address: profile?.address || {},
        primaryCategories: profile?.primaryCategories || [],
        stats: {
          products: counts?.[0]?.products || 0,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/vendors/:id/reviews — recent reviews across this vendor's products
router.get("/:id/reviews", async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10) || 10, 1), 50);

    const listingIds = await Listing.find({ vendor: id }).select("_id title seo.slug").lean();
    const idSet = listingIds.map((l) => l._id);
    if (idSet.length === 0) {
      return res.json({ ok: true, data: { items: [], total: 0, page, pages: 0 } });
    }
    const listingMap = Object.fromEntries(
      listingIds.map((l) => [l._id.toString(), { title: l.title, slug: l.seo?.slug || l._id.toString() }])
    );

    const [items, total] = await Promise.all([
      Review.find({ productId: { $in: idSet }, verifiedPurchase: true, moderationStatus: { $ne: "rejected" } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("customerId", "firstName")
        .lean(),
      Review.countDocuments({ productId: { $in: idSet }, verifiedPurchase: true, moderationStatus: { $ne: "rejected" } }),
    ]);

    const safe = items.map((r) => {
      const prod = listingMap[r.productId?.toString?.() || ""] || {};
      return {
        _id: r._id,
        productId: r.productId,
        productTitle: prod.title || "Product",
        productSlug: prod.slug || "",
        rating: r.rating,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
        customerName: r.customerId ? `${r.customerId.firstName || ""}***`.trim() : "Customer",
      };
    });

    return res.json({ ok: true, data: { items: safe, total, page, pages: Math.ceil(total / limit) } });
  } catch (e) {
    next(e);
  }
});

export default router;

