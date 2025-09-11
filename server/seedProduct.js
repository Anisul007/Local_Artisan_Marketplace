// server/seedProduct.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./src/models/Product.js";
import User from "./src/models/User.js";
import { connectDB } from "./src/config/db.js";

dotenv.config();

const seedProduct = async () => {
  try {
    await connectDB(process.env.MONGO_URI);

    // Find any vendor from DB
    const vendor = await User.findOne({ role: "vendor" });
    if (!vendor) {
      console.log("❌ No vendor found. Please register a vendor first.");
      process.exit(1);
    }

    // Insert a sample product
    const product = await Product.create({
      vendor: vendor._id,
      name: "Handmade Wooden Bowl",
      description: "Eco-friendly handmade bowl",
      category: "home decor",
      price: 25,
      stock: 50,
      image: "https://example.com/bowl.jpg",
      status: "live"
    });

    console.log("✅ Product inserted:", product);
    process.exit();
  } catch (error) {
    console.error("❌ Error seeding product:", error);
    process.exit(1);
  }
};

seedProduct();
