// server/src/routes/promotions.js — vendor CRUD for promotions
import { Router } from "express";
import mongoose from "mongoose";
import Promotion from "../models/Promotion.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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

router.use(requireAuth, requireVendor);

// GET /api/vendor/promotions — list current vendor's promotions
router.get("/", async (req, res, next) => {
  try {
    const vid = vendorId(req);
    const list = await Promotion.find({ vendor: vid }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: { items: list } });
  } catch (e) {
    next(e);
  }
});

// POST /api/vendor/promotions — create
router.post("/", async (req, res, next) => {
  try {
    const vid = vendorId(req);
    const {
      name,
      type = "percentage",
      value,
      code = "",
      minPurchaseCents = 0,
      startDate,
      endDate,
      listingIds = [],
      active = true,
    } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ ok: false, message: "name required" });
    if (!["percentage", "fixed_amount"].includes(type)) return res.status(400).json({ ok: false, message: "type must be percentage or fixed_amount" });
    const numVal = Number(value);
    if (Number.isNaN(numVal) || numVal < 1) return res.status(400).json({ ok: false, message: "value must be a positive number" });
    if (type === "percentage" && numVal > 100) return res.status(400).json({ ok: false, message: "percentage value cannot exceed 100" });

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!start || !end || start >= end) return res.status(400).json({ ok: false, message: "startDate and endDate required, endDate must be after startDate" });

    const listingIdArr = Array.isArray(listingIds) ? listingIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [];

    const doc = await Promotion.create({
      vendor: vid,
      name: name.trim(),
      type,
      value: numVal,
      code: String(code || "").trim().toUpperCase(),
      minPurchaseCents: Math.max(0, Math.round(Number(minPurchaseCents) || 0)),
      startDate: start,
      endDate: end,
      listingIds: listingIdArr,
      active: !!active,
    });

    return res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

// GET /api/vendor/promotions/:id
router.get("/:id", async (req, res, next) => {
  try {
    const vid = vendorId(req);
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const doc = await Promotion.findOne({ _id: id, vendor: vid }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: "Promotion not found" });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

// PUT /api/vendor/promotions/:id
router.put("/:id", async (req, res, next) => {
  try {
    const vid = vendorId(req);
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const doc = await Promotion.findOne({ _id: id, vendor: vid });
    if (!doc) return res.status(404).json({ ok: false, message: "Promotion not found" });

    const {
      name,
      type,
      value,
      code,
      minPurchaseCents,
      startDate,
      endDate,
      listingIds,
      active,
    } = req.body || {};

    if (name !== undefined) doc.name = String(name).trim();
    if (type !== undefined) {
      if (!["percentage", "fixed_amount"].includes(type)) return res.status(400).json({ ok: false, message: "type must be percentage or fixed_amount" });
      doc.type = type;
    }
    if (value !== undefined) {
      const numVal = Number(value);
      if (Number.isNaN(numVal) || numVal < 1) return res.status(400).json({ ok: false, message: "value must be a positive number" });
      if (doc.type === "percentage" && numVal > 100) return res.status(400).json({ ok: false, message: "percentage value cannot exceed 100" });
      doc.value = numVal;
    }
    if (code !== undefined) doc.code = String(code).trim().toUpperCase();
    if (minPurchaseCents !== undefined) doc.minPurchaseCents = Math.max(0, Math.round(Number(minPurchaseCents) || 0));
    if (startDate !== undefined) doc.startDate = new Date(startDate);
    if (endDate !== undefined) doc.endDate = new Date(endDate);
    if (doc.startDate >= doc.endDate) return res.status(400).json({ ok: false, message: "endDate must be after startDate" });
    if (listingIds !== undefined) doc.listingIds = Array.isArray(listingIds) ? listingIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [];
    if (active !== undefined) doc.active = !!active;

    await doc.save();
    return res.json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/vendor/promotions/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const vid = vendorId(req);
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid id" });
    const doc = await Promotion.findOneAndDelete({ _id: id, vendor: vid });
    if (!doc) return res.status(404).json({ ok: false, message: "Promotion not found" });
    return res.json({ ok: true, data: { deleted: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
