// server/src/index.js
import "dotenv/config";
import path from "path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { connectDB } from "./config/db.js";

// Routes (existing)
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import listingsRoutes from "./routes/listings.js";
import uploadsRoutes from "./routes/uploads.js";
import reviewsRoutes from "./routes/reviews.js";
import publicListingsRoutes from "./routes/publicListings.js";

// Routes (new)
import vendorProfileRoutes from "./routes/vendor.profile.js"; // exposes GET/PUT "/profile", POST "/profile/logo"
import vendorMiscRoutes from "./routes/vendor.misc.js";       // exposes "/summary", "/products", "/orders"

const app = express();

/* ------------------------- Security & Parsers ------------------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow /Public images cross-origin (Vite dev)
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);

/* ---------------------------- CORS (flex) ----------------------------- */
const envOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowlist = [
  ...envOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowlist.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

/* ---------------------------- Static files --------------------------- */
// legacy public folder
app.use("/Public", express.static(path.join(process.cwd(), "Public")));
// serve uploaded vendor logos: /uploads/vendor-logos/xxx.jpg
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ---------------------------- Rate limiting --------------------------- */
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

/* ------------------------------- Routes ------------------------------- */
// Health first (fast path)
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Auth & core
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);

// Vendor (auth enforced inside routers)
app.use("/api/vendor/listings", listingsRoutes);
app.use("/api/vendor/reviews", reviewsRoutes);

// Vendor profile + dashboard helpers
// NOTE: vendor.profile.js defines "/profile" & "/profile/logo" -> final paths:
//   GET/PUT /api/vendor/profile
//   POST    /api/vendor/profile/logo
app.use("/api/vendor", vendorProfileRoutes);

// Dashboard helpers (summary/products/orders)
app.use("/api/vendor", vendorMiscRoutes);

// Public catalog (customer-facing)
app.use("/api/listings", publicListingsRoutes);

// Uploads (vendor-only inside the route)
app.use("/api/uploads", uploadsRoutes);

/* ----------------------------- 404 handler ---------------------------- */
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, message: "Not Found" });
  }
  next();
});

/* ---------------------------- Error handler --------------------------- */
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || "Server error";
  if (process.env.NODE_ENV !== "test") {
    console.error("[API ERROR]", status, message);
  }
  res.status(status).json({ ok: false, message });
});

/* ----------------------------- Boot server --------------------------- */
const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 API running at http://localhost:${PORT}`)
  );
});



