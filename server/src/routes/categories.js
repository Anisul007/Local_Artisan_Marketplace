import { Router } from "express";
import Category from "../models/Category.js";

const router = Router();

// Public: return all active categories (sorted hierarchically by path)
router.get("/", async (_req, res, next) => {
  try {
    const cats = await Category.find({ isActive: true }).sort({ path: 1 });
    res.json(cats);
  } catch (e) {
    next(e);
  }
});

export default router;
