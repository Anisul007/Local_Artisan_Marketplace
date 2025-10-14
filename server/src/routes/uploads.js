import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "Public", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.toLowerCase().replace(/[^a-z0-9.\-]+/g, "_");
    cb(null, `${ts}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB per file
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(png|jpe?g|webp)/.test(file.mimetype);
    cb(ok ? null : new Error("Only PNG/JPG/WEBP allowed"), ok);
  }
});

router.post("/", requireAuth, upload.array("files", 8), (req, res) => {
  const base = process.env.PUBLIC_BASE_URL || "";
  const urls = (req.files || []).map(f => {
    const rel = `/Public/uploads/${path.basename(f.path)}`;
    return base ? `${base}${rel}` : rel;
  });
  res.json({ ok: true, urls });
});

export default router;
