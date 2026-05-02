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
import { verifyMailConfig } from "./utils/email.js";
import { sanitizeBody } from "./middleware/security.js";

// Routes (existing)
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import listingsRoutes from "./routes/listings.js";
import uploadsRoutes from "./routes/uploads.js";
import reviewsRoutes from "./routes/reviews.js";
import publicListingsRoutes from "./routes/public-listings.js";
import ordersRoutes from "./routes/orders.js";
import customerReviewsRoutes from "./routes/customer-reviews.js";
import publicVendorsRoutes from "./routes/public-vendors.js";
import promotionsRoutes from "./routes/promotions.js";
import promotionsPublicRoutes from "./routes/promotions-public.js";

// Routes (new)
import vendorProfileRoutes from "./routes/vendor-profile.js"; // GET/PUT "/profile", POST "/profile/logo"
import vendorMiscRoutes from "./routes/vendor-misc.js"; // "/summary", "/products", "/orders"
import adminProfileRoutes from "./routes/admin-profile.js";
import adminToolsRoutes from "./routes/admin-tools.js";
import contactMessagesRoutes from "./routes/contact-messages.js";
import abuseReportsRoutes from "./routes/abuse-reports.js";

const app = express();
app.disable("x-powered-by");

const jwtSecret = String(process.env.JWT_SECRET || "");
if (
  process.env.NODE_ENV === "production" &&
  (!jwtSecret || jwtSecret.includes("change-this-in-production"))
) {
  throw new Error("Unsafe JWT_SECRET for production. Set a strong secret in server/.env.");
}

/* ------------------------- Security & Parsers ------------------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: false, // allow /Public images cross-origin (Vite dev)
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "blob:"],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", "data:"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(sanitizeBody);

/* ---------------------------- CORS (flex) ----------------------------- */
const envOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowlist = [
  ...(process.env.NODE_ENV === "production"
    ? envOrigins
    : [
        ...envOrigins,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
      ]),
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
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health",
  })
);
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: "Too many auth attempts. Please try again later." },
  })
);

/* ------------------------------- Routes ------------------------------- */
// Health first (fast path)
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Auth & core
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);

// Vendor (auth enforced inside routers)
app.use("/api/vendor/listings", listingsRoutes);
app.use("/api/vendor/promotions", promotionsRoutes);
app.use("/api/vendor/reviews", reviewsRoutes);

// Vendor profile + dashboard helpers
// NOTE: vendor-profile.js defines "/profile" & "/profile/logo" -> final paths:
//   GET/PUT /api/vendor/profile
//   POST    /api/vendor/profile/logo
app.use("/api/vendor", vendorProfileRoutes);

// Dashboard helpers (summary/products/orders)
app.use("/api/vendor", vendorMiscRoutes);
app.use("/api/admin", adminProfileRoutes);
app.use("/api/admin", adminToolsRoutes);
app.use("/api/contact-messages", contactMessagesRoutes);
app.use("/api/abuse-reports", abuseReportsRoutes);

// Public catalog (customer-facing)
app.use("/api/listings", publicListingsRoutes);
// Public vendor storefronts
app.use("/api/vendors", publicVendorsRoutes);

// Customer orders (auth required)
app.use("/api/orders", ordersRoutes);
// Coupon validation (public)
app.use("/api/promotions", promotionsPublicRoutes);

// Customer reviews (POST create, GET by listingId)
app.use("/api/customer/reviews", customerReviewsRoutes);

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

connectDB(process.env.MONGO_URI || "").then(async () => {
  await verifyMailConfig();
  app.listen(PORT, () =>
    console.log(`🚀 API running at http://localhost:${PORT}`)
  );
});



