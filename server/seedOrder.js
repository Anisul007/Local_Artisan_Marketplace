import mongoose from "mongoose";
import "dotenv/config.js";
import Order from "./src/models/Order.js";
import Product from "./src/models/Product.js";
import User from "./src/models/User.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // find one customer, one vendor, and one product
    const customer = await User.findOne({ role: "customer" });
    const vendor = await User.findOne({ role: "vendor" });
    const product = await Product.findOne();

    if (!customer || !vendor || !product) {
      console.log("❌ Need at least one customer, one vendor, and one product in DB");
      process.exit();
    }

    // create an order
    const order = await Order.create({
      customer: customer._id,
      vendor: vendor._id,
      items: [
        {
          product: product._id,
          quantity: 2,
          price: product.price,
        },
      ],
      totalAmount: product.price * 2,
      status: "pending",
    });

    console.log("✅ Order inserted:", order);
    process.exit();
  } catch (err) {
    console.error("❌ Error inserting order:", err);
    process.exit(1);
  }
};

run();
