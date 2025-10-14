import mongoose from "mongoose";

/**
 * DEPRECATED: vendor subdocument kept only for backward compatibility.
 * Source of truth for vendor details is now VendorProfile.
 */
const LegacyVendorSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true },
    phone:        { type: String, trim: true },
    website:      { type: String, trim: true },
    description:  { type: String, trim: true },

    // legacy single category (migrated to array automatically)
    primaryCategory: { type: String, trim: true },

    // legacy multi-category (kept if some old code still writes here)
    primaryCategories: { type: [String], default: [], index: true },

    logoUrl: { type: String, trim: true },
  },
  { _id: false }
);

// Migrate legacy single category -> array automatically
LegacyVendorSchema.pre("save", function (next) {
  if ((!this.primaryCategories || this.primaryCategories.length === 0) && this.primaryCategory) {
    const c = String(this.primaryCategory || "").trim();
    if (c) this.primaryCategories = [c];
  }
  next();
});

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["customer", "vendor"],
      required: true,
      index: true,
    },

    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },

    passwordHash: { type: String, required: true },

    /* Customer fields (keep simple) */
    address: { type: String, trim: true },
    dob: Date,

    /**
     * DEPRECATED: do not rely on this for new code.
     * We keep it with select:false so it won't be returned unless explicitly asked.
     */
    vendor: { type: LegacyVendorSchema, select: false },

    // ====== Password reset fields ======
    resetCodeHash:      { type: String, select: false },
    resetCodeExpires:   { type: Date,   select: false },
    resetCodeAttempts:  { type: Number, default: 0, select: false },
    lastResetRequestAt: { type: Date,   select: false },

    // ====== Email verification fields ======
    isVerified:         { type: Boolean, default: false },
    verifyCodeHash:     { type: String, select: false },
    verifyCodeExpires:  { type: Date,   select: false },
    lastVerifyEmailAt:  { type: Date,   select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: hideSensitive },
    toObject: { virtuals: true, transform: hideSensitive },
  }
);

/** Hide sensitive fields automatically in JSON responses */
function hideSensitive(_doc, ret) {
  delete ret.passwordHash;
  delete ret.resetCodeHash;
  delete ret.resetCodeExpires;
  delete ret.resetCodeAttempts;
  delete ret.lastResetRequestAt;
  delete ret.verifyCodeHash;
  delete ret.verifyCodeExpires;
  delete ret.lastVerifyEmailAt;
  // vendor subdoc is select:false anyway, but make sure
  delete ret.vendor;
  return ret;
}

/* Convenience virtuals */
UserSchema.virtual("fullName").get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(" ");
});
UserSchema.virtual("isVendor").get(function () {
  return this.role === "vendor";
});

/** Minimal safe payload for storing in session / cookies, etc. */
UserSchema.methods.safe = function () {
  const { _id, role, firstName, lastName, email, username, isVerified } = this;
  return { id: _id, role, firstName, lastName, email, username, isVerified };
};

export default mongoose.model("User", UserSchema);

