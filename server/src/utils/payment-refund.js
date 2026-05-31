import PaymentTransaction from "../models/PaymentTransaction.js";

/** When an order is cancelled or rejected after payment, queue it for admin refund handling. */
export async function flagRefundForOrder(orderId, reason = "Order cancelled or rejected") {
  if (!orderId) return;
  await PaymentTransaction.updateMany(
    { order: orderId, status: "paid", refundStatus: { $in: ["none", "declined"] } },
    { $set: { refundStatus: "requested", refundReason: reason } }
  );
}
