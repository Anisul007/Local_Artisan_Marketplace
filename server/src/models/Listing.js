import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const ListingSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true, minlength: 3, maxlength: 120, trim: true },
    description: { type: String, required: true, minlength: 20, maxlength: 5000 },

    pricing: {
      currency: { type: String, default: "AUD", uppercase: true },
      priceCents: { type: Number, required: true, min: 1 },
      compareAtCents: { type: Number, min: 0 },
    },

    inventory: {
      stockQty: { type: Number, default: 0, min: 0 },
      status: {
        type: String,
        enum: ["draft", "active", "out_of_stock", "unavailable", "archived"],
        default: "draft",
      },
    },

    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }],
    primaryCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

    images: { type: [ImageSchema], default: [] },

    seo: {
      slug: { type: String, required: true, lowercase: true, trim: true },
      metaTitle: { type: String, maxlength: 70 },
      metaDescription: { type: String, maxlength: 160 },
    },

    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },

    ratingsCount: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
ListingSchema.index({ "seo.slug": 1 }, { unique: true });
ListingSchema.index({ vendor: 1, "inventory.status": 1, updatedAt: -1 });
ListingSchema.index({ primaryCategory: 1, "inventory.status": 1 });
ListingSchema.index({ title: "text", description: "text" });

// Helpers
ListingSchema.methods.requirePrimaryImage = function () {
  return Array.isArray(this.images) && this.images.some((i) => i.isPrimary);
};
ListingSchema.methods.canPublish = function () {
  return (
    !!this.title &&
    !!this.description &&
    (this.pricing?.priceCents ?? 0) > 0 &&
    Array.isArray(this.categories) &&
    this.categories.length > 0 &&
    this.requirePrimaryImage()
  );
};

// --- Hardening hooks ---

// Lightweight slugify (same rules as routes)
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Normalize before validation
ListingSchema.pre("validate", function normalize(next) {
  // priceCents coercion
  if (this.pricing && this.pricing.priceCents != null) {
    this.pricing.priceCents = Math.max(1, Math.round(this.pricing.priceCents));
  }

  // rating guard
  if (this.ratingsCount != null) this.ratingsCount = Math.max(0, Math.round(this.ratingsCount));
  if (this.ratingAvg != null) this.ratingAvg = Math.min(5, Math.max(0, Number(this.ratingAvg)));

  // ensure primaryCategory is included in categories
  if (this.primaryCategory) {
    const idStr = String(this.primaryCategory);
    const set = new Set((this.categories || []).map(String));
    if (!set.has(idStr)) {
      this.categories = [...set, idStr]; // append without duplicates
    }
  }

  // ensure only one primary image (keep first)
  if (Array.isArray(this.images)) {
    const firstPrimary = this.images.findIndex((i) => i && i.isPrimary);
    if (firstPrimary > -1) {
      this.images = this.images.map((img, idx) => ({ ...img.toObject?.() ?? img, isPrimary: idx === firstPrimary }));
    }
  }

  // auto-generate slug if missing
  if (!this.seo) this.seo = {};
  if (!this.seo.slug && this.title) {
    this.seo.slug = `${slugify(this.title)}-${Date.now()}`;
  }

  next();
});

// If set active and no publishedAt, set it
ListingSchema.pre("save", function setPublishedAt(next) {
  if (this.isModified("inventory.status") && this.inventory?.status === "active" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  // If archived, ensure status reflects it
  if (this.isModified("archivedAt") && this.archivedAt && this.inventory?.status !== "archived") {
    this.inventory.status = "archived";
  }
  next();
});

const Listing = mongoose.model("Listing", ListingSchema);
export default Listing;
