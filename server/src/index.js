// server/src/index.js
import "dotenv/config.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";

const app = express();

/* ------------------------- Security & Parsers ------------------------- */
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// If you ever run behind a reverse proxy (Railway/Render/Heroku/NGINX), keep this:
app.set("trust proxy", 1);

/* ---------------------------- CORS (fix) ----------------------------- */
// Allow your dev origins (Vite often falls back to 5174/5175 or uses 127.0.0.1)
const allowlist = [
  process.env.CLIENT_ORIGIN,          // e.g. http://localhost:5173
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin or tools (e.g. curl) with no origin
      if (!origin || allowlist.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // REQUIRED for cookies
  })
);

/* ---------------------------- Rate limiting --------------------------- */
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

/* ------------------------------- Routes ------------------------------- */
app.use("/api/auth", authRoutes);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ----------------------------- Boot server --------------------------- */
const PORT = process.env.PORT || 4000;

connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 API running at http://localhost:${PORT}`)
  );
});

