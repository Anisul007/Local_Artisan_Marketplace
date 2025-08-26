import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    businessName: { type: String, trim: true },
    phone:        { type: String, trim: true },
    website:      { type: String, trim: true },
    description:  { type: String, trim: true },
    primaryCategory: { type: String, trim: true },
    logoUrl:      { type: String, trim: true }
  },
  { _id: false }
);

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

    address: { type: String, trim: true },

    dob: Date,              // customer only
    vendor: VendorSchema,   // vendor only

    // ====== NEW: fields for Forgot Password (6-digit OTP) ======
    resetCodeHash: { type: String },     // bcrypt hash of OTP
    resetCodeExpires: { type: Date },    // expiry timestamp
    resetCodeAttempts: { type: Number, default: 0 }, // throttle attempts
    lastResetRequestAt: { type: Date }   // per-email rate-limit
    // ===========================================================
  },
  { timestamps: true }
);

// do NOT ever return passwordHash from APIs
UserSchema.methods.safe = function () {
  const { _id, role, firstName, lastName, email, username } = this;
  return { id: _id, role, firstName, lastName, email, username };
};

export default mongoose.model("User", UserSchema);
