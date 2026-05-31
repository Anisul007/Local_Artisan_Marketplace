import mongoose from "mongoose";
import Order from "../models/Order.js";
import Review from "../models/Review.js";

/** Order statuses that mean the customer received their items. */
export const DELIVERED_ORDER_STATUSES = ["completed", "delivered"];

export function isDeliveredOrderStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return DELIVERED_ORDER_STATUSES.includes(s);
}

export async function findDeliveredOrderWithListing(customerId, listingId) {
  const listingObjId = new mongoose.Types.ObjectId(String(listingId));
  const customerObjId = new mongoose.Types.ObjectId(String(customerId));
  return Order.findOne({
    customer: customerObjId,
    status: { $in: DELIVERED_ORDER_STATUSES },
    "items.listing": listingObjId,
  }).lean();
}

export async function getCustomerReviewEligibility(customerId, listingId) {
  const existing = await Review.findOne({
    productId: listingId,
    customerId,
  }).lean();

  if (existing) {
    return { canReview: false, hasReviewed: true, reason: "already_reviewed" };
  }

  const delivered = await findDeliveredOrderWithListing(customerId, listingId);
  if (!delivered) {
    return { canReview: false, hasReviewed: false, reason: "not_delivered" };
  }

  return { canReview: true, hasReviewed: false, reason: null };
}
