import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    line1:    { type: String, trim: true },
    line2:    { type: String, trim: true },
    city:     { type: String, trim: true },
    state:    { type: String, trim: true },
    postcode: { type: String, trim: true },
    country:  { type: String, trim: true, default: "AU" },
  },
  { _id: false }
);

const VendorProfileSchema = new mongoose.Schema(
  {
    // 1:1 with user (vendor)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    businessName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    phone:        { type: String, trim: true },
    website:      { type: String, trim: true },
    bio:          { type: String, trim: true, maxlength: 1000 },

    // served from /Public/uploads/vendor-logos/…
    logoUrl:    { type: String, trim: true },
    brandColor: { type: String, trim: true, default: "#6d28d9" },

    address: { type: AddressSchema, default: {} },

    // Optional: categories the shop sells in (slugs)
    primaryCategories: { type: [String], default: [], index: true },

    // simple computed % for UI nudges
    completeness: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

/** Recompute a naive completeness score for UI hints */
VendorProfileSchema.methods.computeCompleteness = function () {
  const checks = [
    !!this.businessName,
    !!this.contactEmail,
    !!this.logoUrl,
    !!this.address?.city,
    !!this.phone,
  ];
  this.completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return this.completeness;
};

VendorProfileSchema.pre("save", function (next) {
  this.computeCompleteness();
  next();
});

export default mongoose.model("VendorProfile", VendorProfileSchema);

