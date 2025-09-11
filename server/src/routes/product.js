import express from "express";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js"; // ensures vendor is logged in

const router = express.Router();

/**
 * Add a new product
 * POST /api/products
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description, category, price, stock, image } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ ok: false, message: "Name, category, and price are required." });
    }

    const product = await Product.create({
      vendor: req.user.id, // requireAuth attaches logged-in user
      name,
      description,
      category,
      price,
      stock,
      image,
      status: "live"
    });

    res.status(201).json({ ok: true, product });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;
