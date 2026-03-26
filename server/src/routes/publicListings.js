import { Router } from "express";
import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import VendorProfile from "../models/VendorProfile.js";

const router = Router();

/** Attach vendor display info (businessName, logoUrl) from User + VendorProfile to listing(s). */
async function attachVendorInfo(items) {
  if (!items || items.length === 0) return items;
  const list = Array.isArray(items) ? items : [items];
  const vendorIds = [...new Set(list.map((i) => i.vendor).filter(Boolean))];
  if (vendorIds.length === 0) return items;

  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: vendorIds } }).select("_id firstName lastName").lean(),
    VendorProfile.find({ user: { $in: vendorIds } }).select("user businessName logoUrl bio website").lean(),
  ]);
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
  const profileMap = Object.fromEntries(profiles.map((p) => [p.user.toString(), p]));

  function enrichVendor(vendorId) {
    if (!vendorId) return null;
    const idStr = vendorId.toString?.() || vendorId;
    const user = userMap[idStr];
    const profile = profileMap[idStr];
    const businessName = profile?.businessName || (user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : null);
    return {
      _id: vendorId,
      businessName: businessName || "Artisan",
      name: businessName,
      displayName: businessName,
      logoUrl: profile?.logoUrl || "",
      avatarUrl: profile?.logoUrl || "",
      bio: profile?.bio || "",
      website: profile?.website || "",
    };
  }

  return list.map((item) => ({
    ...item,
    vendor: item.vendor ? enrichVendor(item.vendor) : null,
  }));
}

// GET /api/listings?q=&category=&page=&min=&max=&sort=
// category: single slug or comma-separated (e.g. home or home,jewellery)
// sort: newest | price_asc | price_desc | popular
router.get("/", async (req, res, next) => {
  try {
    const { q = "", category = "", page = "1", min = "", max = "", sort = "newest", vendor = "" } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lim = 24;

    const where = { "inventory.status": "active" };

    if (vendor && String(vendor).trim()) {
      const v = String(vendor).trim();
      if (mongoose.Types.ObjectId.isValid(v)) where.vendor = v;
    }

    if (q && String(q).trim()) {
      where.$or = [
        { title: { $regex: String(q).trim(), $options: "i" } },
        { description: { $regex: String(q).trim(), $options: "i" } },
      ];
    }

    if (category && String(category).trim()) {
      const slugs = String(category).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (slugs.length > 0) {
        const cats = await Category.find({ slug: { $in: slugs }, isActive: true }).select("_id").lean();
        const ids = cats.map((c) => c._id);
        if (ids.length > 0) where.categories = { $in: ids };
      }
    }

    const minNum = min !== "" && min !== undefined ? Number(min) : null;
    const maxNum = max !== "" && max !== undefined ? Number(max) : null;
    if (minNum != null && !Number.isNaN(minNum)) {
      where["pricing.priceCents"] = where["pricing.priceCents"] || {};
      where["pricing.priceCents"].$gte = minNum;
    }
    if (maxNum != null && !Number.isNaN(maxNum)) {
      where["pricing.priceCents"] = where["pricing.priceCents"] || {};
      where["pricing.priceCents"].$lte = maxNum;
    }

    let sortOption = { publishedAt: -1 };
    const sortVal = String(sort).toLowerCase();
    switch (sortVal) {
      case "price_asc":
      case "price-asc":
        sortOption = { "pricing.priceCents": 1, publishedAt: -1 };
        break;
      case "price_desc":
      case "price-desc":
        sortOption = { "pricing.priceCents": -1, publishedAt: -1 };
        break;
      case "popular":
      case "rating":
        sortOption = { ratingAvg: -1, ratingsCount: -1, publishedAt: -1 };
        break;
      case "name":
        sortOption = { title: 1, publishedAt: -1 };
        break;
      case "newest":
      case "new":
      default:
        sortOption = { publishedAt: -1 };
        break;
    }

    const [rawItems, total] = await Promise.all([
      Listing.find(where).sort(sortOption).skip((pg - 1) * lim).limit(lim).lean(),
      Listing.countDocuments(where),
    ]);
    const items = await attachVendorInfo(rawItems);

    res.json({ ok: true, data: { items, page: pg, pages: Math.ceil(total / lim), total } });
  } catch (e) { next(e); }
});

// GET /api/listings/:idOrSlug — supports both MongoDB _id and seo.slug
router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
    const query = { "inventory.status": "active" };
    if (isObjectId) query._id = id;
    else query["seo.slug"] = id;

    let row = await Listing.findOne(query).lean();
    if (!row) return res.status(404).json({ message: "Not found" });
    const [enriched] = await attachVendorInfo([row]);
    res.json({ ok: true, data: enriched });
  } catch (e) { next(e); }
});

export default router;
