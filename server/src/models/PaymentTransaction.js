import mongoose from "mongoose";

const PaymentTransactionSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: false, default: null, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "AUD" },
    status: { type: String, enum: ["paid", "failed", "refunded", "pending"], default: "paid", index: true },
    gatewayReference: { type: String, default: "", index: true },
    refundStatus: { type: String, enum: ["none", "requested", "approved", "declined", "processed"], default: "none", index: true },
    refundReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("PaymentTransaction", PaymentTransactionSchema);
