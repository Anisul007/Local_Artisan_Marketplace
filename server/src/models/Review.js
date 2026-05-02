import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true, index: true },
  comment: { type: String, default: "" },
  verifiedPurchase: { type: Boolean, default: false },
  moderationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved", index: true },
  reportedCount: { type: Number, default: 0, min: 0 },
  moderationNote: { type: String, default: "" },
}, { timestamps: true });

ReviewSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.model("Review", ReviewSchema);
