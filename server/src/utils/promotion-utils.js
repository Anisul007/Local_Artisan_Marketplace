import Promotion from "../models/Promotion.js";

/** Promotions customers can use at checkout or on the storefront */
export function isPromotionApproved(promo) {
  if (!promo) return false;
  if (promo.scope === "global") {
    return promo.moderation?.status === "approved" || !promo.moderation?.status;
  }
  return promo.moderation?.status === "approved";
}

export function isPromotionLive(promo, now = new Date()) {
  if (!promo || !promo.active) return false;
  if (!isPromotionApproved(promo)) return false;
  const start = promo.startDate ? new Date(promo.startDate) : null;
  const end = promo.endDate ? new Date(promo.endDate) : null;
  if (!start || !end) return false;
  return start <= now && end >= now;
}

export function discountedPriceCents(priceCents, promo) {
  const base = Math.max(0, Number(priceCents) || 0);
  if (!promo || base < 1) return base;
  if (promo.type === "percentage") {
    return Math.max(1, Math.round((base * (100 - Number(promo.value || 0))) / 100));
  }
  return Math.max(1, base - Math.min(Number(promo.value || 0), base));
}

function listingVendorId(listing) {
  const v = listing?.vendor;
  if (!v) return "";
  if (typeof v === "object" && v._id) return v._id.toString?.() || String(v._id);
  return v.toString?.() || String(v);
}

export function promoAppliesToListing(promo, listing) {
  if (!promo || !listing?._id) return false;
  const lid = listing._id.toString?.() || String(listing._id);
  const vendorId = listingVendorId(listing);

  if (promo.scope === "global") {
    if (promo.listingIds?.length > 0) {
      return promo.listingIds.some((id) => id.toString() === lid);
    }
    return true;
  }

  const promoVendor = promo.vendor?.toString?.() || String(promo.vendor || "");
  if (!promoVendor || promoVendor !== vendorId) return false;
  if (!promo.listingIds?.length) return true;
  return promo.listingIds.some((id) => id.toString() === lid);
}

/** Pick the auto sale (no code) that gives the lowest sale price for this listing */
export function bestAutoPromoForListing(listing, promos) {
  const base = Number(listing?.pricing?.priceCents) || 0;
  let best = null;
  let bestPrice = base;
  for (const promo of promos) {
    if (String(promo.code || "").trim()) continue;
    if (!promoAppliesToListing(promo, listing)) continue;
    const sale = discountedPriceCents(base, promo);
    if (sale < bestPrice) {
      bestPrice = sale;
      best = promo;
    }
  }
  return best;
}

export function applyAutoPromoToListing(listing, promo) {
  if (!promo) return listing;
  const original = Number(listing.pricing?.priceCents) || 0;
  const sale = discountedPriceCents(original, promo);
  if (sale >= original) return listing;
  const existingCompare = Number(listing.pricing?.compareAtCents) || 0;
  return {
    ...listing,
    pricing: {
      ...listing.pricing,
      priceCents: sale,
      compareAtCents: Math.max(original, existingCompare),
    },
    promotionApplied: {
      id: promo._id,
      name: promo.name,
      type: promo.type,
      value: promo.value,
    },
  };
}

export async function loadLiveAutoPromos({ vendorIds = [], now = new Date() } = {}) {
  const ids = [...new Set(vendorIds.filter(Boolean).map((id) => id.toString()))];
  const or = [
    {
      scope: "global",
      "moderation.status": "approved",
      code: { $in: ["", null] },
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    },
  ];
  if (ids.length) {
    or.push({
      scope: "vendor",
      vendor: { $in: ids },
      "moderation.status": "approved",
      code: { $in: ["", null] },
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
  }
  return Promotion.find({ $or: or }).lean();
}

export async function enrichListingsWithPromotions(listings) {
  if (!Array.isArray(listings) || listings.length === 0) return listings;
  const vendorIds = [...new Set(listings.map((l) => listingVendorId(l)).filter(Boolean))];
  const promos = await loadLiveAutoPromos({ vendorIds });
  return listings.map((listing) => {
    const promo = bestAutoPromoForListing(listing, promos);
    return applyAutoPromoToListing(listing, promo);
  });
}

export function computeCartDiscountForPromo(promo, orderItems, listingMap) {
  let applicableSubtotalCents = 0;
  for (const row of orderItems) {
    const lid = (row.listing?.toString?.() || row.listing || row.listingId || "").toString();
    const listing = listingMap[lid];
    if (!listing) continue;
    if (!promoAppliesToListing(promo, listing)) continue;
    const qty = Math.max(1, Math.floor(Number(row.quantity)) || 1);
    const priceCents = Number(row.priceCents ?? listing.pricing?.priceCents) || 0;
    applicableSubtotalCents += priceCents * qty;
  }
  if (applicableSubtotalCents < (promo.minPurchaseCents || 0)) {
    return { discountCents: 0, error: "Minimum purchase not met" };
  }
  let discountCents =
    promo.type === "percentage"
      ? Math.round((applicableSubtotalCents * promo.value) / 100)
      : Math.min(promo.value, applicableSubtotalCents);
  return { discountCents: Math.max(0, discountCents) };
}

export async function findLiveCouponPromotion(codeStr, now = new Date()) {
  const code = String(codeStr || "").trim().toUpperCase();
  if (!code) return null;
  return Promotion.findOne({
    code,
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { "moderation.status": "approved" },
      { scope: "global", "moderation.status": { $exists: false } },
    ],
  }).lean();
}
