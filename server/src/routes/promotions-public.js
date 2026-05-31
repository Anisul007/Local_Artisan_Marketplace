// server/src/routes/promotions-public.js — validate coupon (no auth)
import { Router } from "express";
import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import {
  findLiveCouponPromotion,
  computeCartDiscountForPromo,
  isPromotionApproved,
} from "../utils/promotion-utils.js";

const router = Router();

/**
 * POST /api/promotions/validate
 * Body: { code: string, items: [{ listingId, quantity }] }
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

    const promo = await findLiveCouponPromotion(codeStr);
    if (!promo || !isPromotionApproved(promo)) {
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

    const orderItems = items.map((row) => ({
      listing: row.listingId || row.listing,
      listingId: row.listingId || row.listing,
      quantity: row.quantity,
      priceCents: listingMap[(row.listingId || row.listing)?.toString?.() || ""]?.pricing?.priceCents,
    }));

    const result = computeCartDiscountForPromo(promo, orderItems, listingMap);
    if (result.error) {
      const minDollars = ((promo.minPurchaseCents || 0) / 100).toFixed(2);
      return res.json({
        ok: true,
        data: {
          valid: false,
          message: result.error === "Minimum purchase not met" ? `Minimum purchase for this code is $${minDollars}` : result.error,
        },
      });
    }
    if (result.discountCents <= 0) {
      return res.json({
        ok: true,
        data: { valid: false, message: "This code does not apply to any items in your cart" },
      });
    }

    return res.json({
      ok: true,
      data: {
        valid: true,
        discountCents: result.discountCents,
        promotionName: promo.name,
        promotionId: promo._id,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
