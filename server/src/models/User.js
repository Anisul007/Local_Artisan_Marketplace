import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true },
    phone:        { type: String, trim: true },
    website:      { type: String, trim: true },
    description:  { type: String, trim: true },

    // NEW: multi-select categories
    primaryCategories: { type: [String], default: [], index: true },

    // Deprecated: kept only for backward compatibility during transition.
    // If this is present and the array is empty, we’ll migrate it on save.
    primaryCategory: { type: String, trim: true, select: false },

    logoUrl:      { type: String, trim: true }
  },
  { _id: false }
);

// Migrate legacy single category -> array automatically
VendorSchema.pre("save", function (next) {
  if ((!this.primaryCategories || this.primaryCategories.length === 0) && this.primaryCategory) {
    const c = String(this.primaryCategory || "").trim();
    if (c) this.primaryCategories = [c];
  }
  next();
});

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["customer", "vendor"], required: true, index: true },

    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true
    },

    username: {
      type: String,
      trim: true,
      index: true,
      sparse: true
    },

    passwordHash: { type: String, required: true },

    phone: { type: String, trim: true },

    address: { type: String, trim: true },

    dob: Date,            // customer only
    vendor: VendorSchema, // vendor only

    // ====== Password reset fields ======
    resetCodeHash:      { type: String },
    resetCodeExpires:   { type: Date },
    resetCodeAttempts:  { type: Number, default: 0 },
    lastResetRequestAt: { type: Date },

    // ====== Email verification fields ======
    isVerified:         { type: Boolean, default: false },
    verifyCodeHash:     { type: String },
    verifyCodeExpires:  { type: Date },
    lastVerifyEmailAt:  { type: Date }
  },
  { timestamps: true }
);

// Never expose sensitive fields
UserSchema.methods.safe = function () {
  const { _id, role, firstName, lastName, email, username, isVerified } = this;
  return { id: _id, role, firstName, lastName, email, username, isVerified };
};

export default mongoose.model("User", UserSchema);

