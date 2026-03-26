import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    title: { type: String, required: true },
    slug: { type: String, default: "" },
    priceCents: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "AUD" },
  },
  { _id: true }
);

const ShippingSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postcode: { type: String, trim: true },
    country: { type: String, trim: true, default: "AU" },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    totalCents: { type: Number, required: true, min: 0 },
    /** Discount from coupon (cents). Order total is subtotal - discountCents */
    discountCents: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: "", trim: true },
    currency: { type: String, default: "AUD" },
    status: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      default: "processing",
      index: true,
    },
    shipping: { type: ShippingSchema, default: {} },
    estimatedDelivery: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

OrderSchema.index({ customer: 1, createdAt: -1 });

export default mongoose.model("Order", OrderSchema);
