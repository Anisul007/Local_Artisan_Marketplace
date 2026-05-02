import mongoose from "mongoose";

const PlatformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // singleton: "default"
    store: {
      name: { type: String, default: "Artisan Avenue" },
      logoUrl: { type: String, default: "" },
      contactEmail: { type: String, default: "" },
      contactPhone: { type: String, default: "" },
    },
    email: {
      supportEmail: { type: String, default: "" },
      orderEmailEnabled: { type: Boolean, default: true },
    },
    tax: {
      defaultRatePct: { type: Number, default: 10 },
      taxNumberLabel: { type: String, default: "ABN" },
    },
    currency: {
      code: { type: String, default: "AUD" },
      symbol: { type: String, default: "$" },
    },
    commissions: {
      vendorPct: { type: Number, default: 10 },
    },
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "" },
    },
    shipping: {
      methods: { type: [String], default: ["standard", "express"] },
      baseFeeCents: { type: Number, default: 1000 },
      zones: { type: [String], default: ["AU"] },
      courierNames: { type: [String], default: ["Australia Post"] },
      deliveryRules: { type: String, default: "" },
      trackingControlEnabled: { type: Boolean, default: true },
    },
    payment: {
      gatewayName: { type: String, default: "manual" },
      payoutTrackingEnabled: { type: Boolean, default: true },
      invoiceMonitoringEnabled: { type: Boolean, default: true },
      failedPaymentAlertsEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformSetting", PlatformSettingSchema);
