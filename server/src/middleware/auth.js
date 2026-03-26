// server/middleware/auth.js
import jwt from "jsonwebtoken";

/**
 * Create the auth cookie.
 * - secure=false on localhost (http) so the browser doesn't drop it.
 * - secure=true in production (https).
 * - sameSite=lax works well for SPA navigation.
 */
export function setAuthCookie(res, payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to server/.env (see .env.example).");
  }
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });
  const isProd = process.env.NODE_ENV === "production";

res.cookie("aa_token", token, {
    httpOnly: true,
    sameSite: "lax",          // keep as "lax" for local dev
    secure: isProd ? true : false,  // must be false on http://localhost
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

}

/**
 * Clear the auth cookie (use in /logout).
 */
export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("aa_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd ? true : false,
    path: "/",
  });
}

/**
 * Require a valid token in aa_token cookie.
 */
export function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, code: "NO_JWT_SECRET" });
  }
  const token = req.cookies?.aa_token;
  if (!token) return res.status(401).json({ ok: false, code: "NO_TOKEN" });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ ok: false, code: "BAD_TOKEN" });
  }
}

