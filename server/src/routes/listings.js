// server/src/routes/listings.js
import { Router } from "express";
import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/* ---------------------------- helpers ---------------------------- */

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

function vendorId(req) {
  const id = req.user?.id || req.user?._id;
  return id?.toString?.() || id;
}

function requireVendor(req, res, next) {
  if (req?.user?.role !== "vendor") {
    return res.status(403).json({ ok: false, message: "Vendor access only" });
  }
  next();
}

function canPublishInline(listing) {
  if (typeof listing?.canPublish === "function") return listing.canPublish();

  const hasPrimary =
    Array.isArray(listing.images) &&
    (listing.images.some((i) => i?.isPrimary) || listing.images.length >= 1);

  const hasCategory =
    (Array.isArray(listing.categories) && listing.categories.length > 0) ||
    !!listing.primaryCategory;

  return (
    !!listing.title &&
    !!listing.description &&
    Number(listing?.pricing?.priceCents) > 0 &&
    hasCategory &&
    hasPrimary
  );
}

router.use(requireAuth, requireVendor);

/* ----------------------------- routes ---------------------------- */

/** Create draft */
router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      description,
      priceCents,
      currency = "AUD",
      categories = [],
      primaryCategory,
      images = [],
    } = req.body || {};

    if (!title?.trim())
      return res.status(400).json({ ok: false, message: "title required" });
    if (!description?.trim())
      return res.status(400).json({ ok: false, message: "description required" });
    if (!priceCents || Number(priceCents) <= 0)
      return res.status(400).json({ ok: false, message: "priceCents > 0 required" });
    if (!primaryCategory)
      return res.status(400).json({ ok: false, message: "primaryCategory required" });
    if (!Array.isArray(categories) || categories.length === 0)
      return res.status(400).json({ ok: false, message: "categories required" });

    const doc = await Listing.create({
      vendor: vendorId(req),
      title: title.trim(),
      description: description.trim(),
      pricing: { priceCents: Number(priceCents), currency },
      categories,
      primaryCategory,
      images,
      seo: { slug: slugify(`${title}-${Date.now()}`) },
      inventory: { stockQty: 0, status: "draft" },
    });

    return res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.["seo.slug"]) {
      return res.status(409).json({ ok: false, message: "slug conflict, try again" });
    }
    next(err);
  }
});

/** List my listings (search + filter + pagination) */
router.get("/", async (req, res, next) => {
  try {
    const { q = "", status = "", page = 1, limit = 10 } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const where = {
      vendor: vendorId(req),
      archivedAt: { $in: [null, undefined] },
    };
    if (status) where["inventory.status"] = status;

    let query = Listing.find(where);
    if (q) {
      // Fallback regex when text index isn't available
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query = Listing.find({
        ...where,
        $or: [{ title: rx }, { description: rx }],
      });
    }

    const [items, total] = await Promise.all([
      query.sort({ updatedAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
      Listing.countDocuments(q ? query.getQuery() : where),
    ]);

    return res.json({
      ok: true,
      data: {
        items,
        pagination: {
          page: pg,
          pages: Math.ceil(total / lim),
          total,
          limit: lim,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

/** Read one of mine */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid listing id" });
    }
    const row = await Listing.findOne({ _id: id, vendor: vendorId(req) }).lean();
    if (!row) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, data: row });
  } catch (e) {
    next(e);
  }
});

/** Update (draft/active) — supports PUT and POST for compatibility */
async function updateHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid listing id" });
    }

    const allowed = [
      "title",
      "description",
      "pricing",
      "categories",
      "primaryCategory",
      "inventory",
      "images",
      "seo",
    ];

    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];

    // normalize pricing if partial fields provided
    if (patch.pricing) {
      patch.pricing = {
        currency: patch.pricing.currency || "AUD",
        priceCents: Number(patch.pricing.priceCents || 0),
      };
    }

    const row = await Listing.findOneAndUpdate(
      { _id: id, vendor: vendorId(req) },
      patch,
      { new: true }
    ).lean();

    if (!row) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, data: row });
  } catch (e) {
    next(e);
  }
}
router.put("/:id", updateHandler);
router.post("/:id", updateHandler); // keep current ListingsAPI.update working

/** Soft delete → archived */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid listing id" });
    }

    const row = await Listing.findOneAndUpdate(
      { _id: id, vendor: vendorId(req) },
      { archivedAt: new Date(), "inventory.status": "archived" },
      { new: true }
    ).lean();
    if (!row) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, message: "Listing archived" });
  } catch (e) {
    next(e);
  }
});

/** Publish (guards required fields incl. primary image) */
router.post("/:id/publish", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid listing id" });
    }

    const row = await Listing.findOne({ _id: id, vendor: vendorId(req) });
    if (!row) return res.status(404).json({ ok: false, message: "Not found" });

    if (!canPublishInline(row)) {
      return res
        .status(400)
        .json({ ok: false, message: "Listing incomplete for publish" });
    }

    row.inventory.status = "active";
    if (!row.publishedAt) row.publishedAt = new Date();
    row.archivedAt = null;

    await row.save();
    // 👇 Message for your toast "confirmation after publish"
    return res.json({ ok: true, message: "Your listing is live!", data: row.toObject() });
  } catch (e) {
    next(e);
  }
});

/** Quick status toggle (active/out_of_stock/unavailable/draft/archived) */
router.post("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body ?? {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "Invalid listing id" });
    }

    const ALLOWED = new Set(["draft", "active", "out_of_stock", "unavailable", "archived"]);
    if (!ALLOWED.has(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const doc = await Listing.findOne({ _id: id, vendor: vendorId(req) });
    if (!doc) return res.status(404).json({ ok: false, message: "Not found" });

    // Guard publishing
    if (status === "active" && !canPublishInline(doc)) {
      return res.status(400).json({ ok: false, message: "Listing incomplete for publish" });
    }

    doc.inventory.status = status;

    if (status === "active") {
      if (!doc.publishedAt) doc.publishedAt = new Date();
      doc.archivedAt = null;
    } else if (status === "archived") {
      doc.archivedAt = new Date();
    } else if (status === "draft") {
      doc.archivedAt = null;
    }

    await doc.save();
    return res.json({ ok: true, data: doc.toObject() });
  } catch (e) {
    next(e);
  }
});

export default router;

