import mongoose from "mongoose";
import "dotenv/config.js";
import Product from "./src/models/Product.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const sample = await Product.create({
      vendor: "68bc20b24c612e3c92f11b58", // replace with real vendor _id from your users collection
      name: "Handmade Wooden Bowl",
      description: "Eco-friendly handmade bowl",
      category: "home decor",
      price: 25,
      stock: 50,
      status: "live"
    });

    console.log("✅ Product inserted:", sample);
    process.exit();
  } catch (err) {
    console.error("❌ Error inserting product:", err);
    process.exit(1);
  }
};

run();
