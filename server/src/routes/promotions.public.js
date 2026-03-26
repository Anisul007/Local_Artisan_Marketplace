// server/src/routes/promotions.public.js — validate coupon (no auth)
import { Router } from "express";
import mongoose from "mongoose";
import Promotion from "../models/Promotion.js";
import Listing from "../models/Listing.js";

const router = Router();

/**
 * POST /api/promotions/validate
 * Body: { code: string, items: [{ listingId, quantity }] }
 * Returns: { ok, data: { valid, discountCents?, promotionName?, message? } }
 */
router.post("/validate", async (req, res, next) => {
  try {
    const { code, items = [] } = req.body || {};
    const codeStr = String(code || "").trim().toUpperCase();
    if (!codeStr) {
      return res.json({ ok: true, data: { valid: false, message: "Enter a coupon code" } });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ ok: true, data: { valid: false, message: "Cart is empty" } });
    }

    const now = new Date();
    const promo = await Promotion.findOne({
      code: codeStr,
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean();

    if (!promo) {
      return res.json({ ok: true, data: { valid: false, message: "Invalid or expired code" } });
    }

    const listingIds = items.map((i) => i.listingId || i.listing).filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (listingIds.length === 0) {
      return res.json({ ok: true, data: { valid: false, message: "No valid items in cart" } });
    }

    const listings = await Listing.find({ _id: { $in: listingIds }, "inventory.status": "active" })
      .select("_id vendor pricing.priceCents")
      .lean();
    const listingMap = Object.fromEntries(listings.map((l) => [l._id.toString(), l]));

    let applicableSubtotalCents = 0;
    for (const row of items) {
      const lid = (row.listingId || row.listing)?.toString?.();
      const listing = listingMap[lid];
      if (!listing || listing.vendor.toString() !== promo.vendor.toString()) continue;
      const inScope = promo.listingIds.length === 0 || promo.listingIds.some((id) => id.toString() === lid);
      if (!inScope) continue;
      const qty = Math.max(1, Math.floor(Number(row.quantity)) || 1);
      const priceCents = Number(listing.pricing?.priceCents) || 0;
      applicableSubtotalCents += priceCents * qty;
    }

    if (applicableSubtotalCents < (promo.minPurchaseCents || 0)) {
      const minDollars = ((promo.minPurchaseCents || 0) / 100).toFixed(2);
      return res.json({
        ok: true,
        data: { valid: false, message: `Minimum purchase for this code is $${minDollars}` },
      });
    }

    let discountCents = 0;
    if (promo.type === "percentage") {
      discountCents = Math.round((applicableSubtotalCents * promo.value) / 100);
    } else {
      discountCents = Math.min(promo.value, applicableSubtotalCents);
    }
    discountCents = Math.max(0, discountCents);

    return res.json({
      ok: true,
      data: {
        valid: true,
        discountCents,
        promotionName: promo.name,
        promotionId: promo._id,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
