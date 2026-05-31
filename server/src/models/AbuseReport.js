import mongoose from "mongoose";

const AbuseReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    reporterName: { type: String, trim: true, default: "" },
    reporterEmail: { type: String, trim: true, default: "" },
    reporterRole: { type: String, enum: ["customer", "vendor", "admin", "other"], default: "other", index: true },
    targetType: {
      type: String,
      enum: ["listing", "vendor", "order", "customer", "other"],
      default: "other",
      index: true,
    },
    targetId: { type: String, default: "", trim: true },
    targetLabel: { type: String, default: "", trim: true, maxlength: 300 },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    details: { type: String, default: "", trim: true, maxlength: 4000 },
    status: { type: String, enum: ["new", "in_review", "resolved"], default: "new", index: true },
    actionNote: { type: String, default: "", trim: true, maxlength: 2000 },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("AbuseReport", AbuseReportSchema);
