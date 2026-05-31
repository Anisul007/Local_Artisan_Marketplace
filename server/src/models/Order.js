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
    deliveryMethod: { type: String, enum: ["standard", "express"], default: "standard" },
  },
  { _id: false }
);

const OrderMessageSchema = new mongoose.Schema(
  {
    fromRole: { type: String, enum: ["vendor", "customer", "system"], required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const OrderIssueSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved"],
      default: "open",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const StatusEventSchema = new mongoose.Schema(
  {
    from: { type: String, default: "", trim: true },
    to: { type: String, required: true, trim: true },
    actorRole: { type: String, enum: ["vendor", "customer", "system"], default: "system" },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
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
      enum: [
        "new",
        "accepted",
        "rejected",
        "in_progress",
        "completed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "new",
      index: true,
    },
    isNewForVendor: { type: Boolean, default: true, index: true },
    vendorDecisionAt: { type: Date, default: null },
    /** Stock was decremented when the order was placed */
    inventoryReserved: { type: Boolean, default: false },
    /** Stock was returned after cancel / reject */
    inventoryReleased: { type: Boolean, default: false },
    shipping: { type: ShippingSchema, default: {} },
    shippingCents: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["card", "paypal", "afterpay", "google_pay"],
      default: "card",
    },
    estimatedDelivery: { type: Date, default: null },
    notes: { type: String, default: "" },
    adminMeta: {
      returnStatus: { type: String, default: "none" },
      returnUpdatedAt: { type: Date, default: null },
      /** Set when an admin opens the order in the control center; clears "new order" sidebar dot only. */
      newOrderSeenAt: { type: Date, default: null },
    },
    statusHistory: { type: [StatusEventSchema], default: [] },
    messages: { type: [OrderMessageSchema], default: [] },
    issues: { type: [OrderIssueSchema], default: [] },
  },
  { timestamps: true }
);

OrderSchema.index({ customer: 1, createdAt: -1 });

export default mongoose.model("Order", OrderSchema);
