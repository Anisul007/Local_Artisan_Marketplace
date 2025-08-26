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

// security / parsers / logs
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cookieParser());  // <-- needed so /me can read aa_token

app.use(cors({
  origin: "http://localhost:5173", // Vite dev origin
  credentials: true,               // <-- REQUIRED for cookies
}));

app.use(express.json());


// rate limit
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// routes
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`🚀 API running at http://localhost:${PORT}`));
});
