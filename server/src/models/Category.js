import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    path: { type: String, required: true }, // e.g. "art/painting/watercolour"
    isActive: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

CategorySchema.index({ parent: 1 });
CategorySchema.index({ path: 1 });

const Category = mongoose.model("Category", CategorySchema);
export default Category;
