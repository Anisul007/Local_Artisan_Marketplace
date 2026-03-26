import mongoose from "mongoose";

const PromotionSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    /** percentage (e.g. 10 = 10% off) or fixed_amount (e.g. 500 = $5 off) */
    type: {
      type: String,
      enum: ["percentage", "fixed_amount"],
      required: true,
      default: "percentage",
    },
    /** For percentage: 1–100. For fixed_amount: cents (e.g. 500 = $5) */
    value: { type: Number, required: true, min: 1 },

    /** Coupon code. If empty, promotion is an automatic sale (by date + scope). */
    code: { type: String, trim: true, uppercase: true, default: "", maxlength: 32 },
    /** Minimum cart total (cents) to apply this promotion. 0 = no minimum */
    minPurchaseCents: { type: Number, default: 0, min: 0 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    /** Listing IDs this promotion applies to. Empty = all vendor listings */
    listingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PromotionSchema.index({ vendor: 1, active: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ code: 1 }, { sparse: true }); // only index non-empty codes

export default mongoose.model("Promotion", PromotionSchema);
