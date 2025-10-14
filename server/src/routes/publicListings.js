import { Router } from "express";
import Listing from "../models/Listing.js";

const router = Router();

// GET /api/listings?q=&category=&page=&min=&max=
router.get("/", async (req, res, next) => {
  try {
    const { q = "", category = "", page = "1", min = "", max = "" } = req.query;
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const lim = 12;

    const where = { "inventory.status": "active" };
    if (q) where.title = { $regex: q, $options: "i" };
    if (category) where.categories = category;
    if (min || max) {
      where["pricing.priceCents"] = {};
      if (min) where["pricing.priceCents"].$gte = Number(min);
      if (max) where["pricing.priceCents"].$lte = Number(max);
    }

    const [items, total] = await Promise.all([
      Listing.find(where).sort({ publishedAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
      Listing.countDocuments(where),
    ]);

    res.json({ ok: true, data: { items, page: pg, pages: Math.ceil(total / lim), total } });
  } catch (e) { next(e); }
});

// GET /api/listings/:idOrSlug
router.get("/:id", async (req, res, next) => {
  try {
    const row = await Listing.findOne({ _id: req.params.id, "inventory.status": "active" }).lean();
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true, data: row });
  } catch (e) { next(e); }
});

export default router;
