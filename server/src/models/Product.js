import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    vendor: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    image: { type: String, trim: true }, // optional product image
    status: { 
      type: String, 
      enum: ["live", "unavailable", "out_of_stock"], 
      default: "live" 
    }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
