import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import VendorProfile from "../models/VendorProfile.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/* ---------- guards ---------- */
function requireVendor(req, res, next) {
  if (req?.user?.role !== "vendor") {
    return res.status(403).json({ ok: false, message: "Vendor access only" });
  }
  next();
}

const getUserId = (req) => req.user?._id || req.user?.id;

/* ---------- Multer (logo upload) ---------- */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// We save inside Public so your existing static handler /Public works
const UPLOAD_DIR = path.join(process.cwd(), "Public", "uploads", "vendor-logos");
ensureDir(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase();
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = /image\/(jpeg|png)/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only JPEG/PNG allowed"), false);
  cb(null, true);
};

const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

/* ---------- helpers ---------- */
async function getOrCreateProfile(userId) {
  let doc = await VendorProfile.findOne({ user: userId });
  if (!doc) doc = await VendorProfile.create({ user: userId });
  return doc;
}

function normalizeAddress(value) {
  if (!value) return undefined;
  // Accept either object or JSON string
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  const allow = ["line1", "line2", "city", "state", "postcode", "country"];
  const out = {};
  for (const k of allow) if (value[k] !== undefined) out[k] = String(value[k]).slice(0, 120);
  return out;
}

/* ---------- routes ---------- */

// GET /api/vendor/profile
router.get("/profile", requireAuth, requireVendor, async (req, res, next) => {
  try {
    const doc = await getOrCreateProfile(getUserId(req));
    res.json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

// PUT /api/vendor/profile
router.put("/profile", requireAuth, requireVendor, async (req, res, next) => {
  try {
    const doc = await getOrCreateProfile(getUserId(req));

    const allowed = ["businessName", "contactEmail", "phone", "bio", "brandColor", "logoUrl", "website"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) doc[k] = String(req.body[k]).slice(0, 300);
    }

    const addr = normalizeAddress(req.body.address);
    if (addr) doc.address = { ...(doc.address || {}), ...addr };

    await doc.save();
    res.json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

// POST /api/vendor/profile/logo  (form-data: file)
router.post(
  "/profile/logo",
  requireAuth,
  requireVendor,
  uploadLogo.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file)
        return res.status(400).json({ ok: false, message: "No file uploaded" });

      // because we’re serving /Public as static, expose with /Public prefix
      const publicUrl = `/Public/uploads/vendor-logos/${req.file.filename}`;

      const doc = await getOrCreateProfile(getUserId(req));
      doc.logoUrl = publicUrl;
      await doc.save();

      res.json({ ok: true, data: { logoUrl: publicUrl } });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
