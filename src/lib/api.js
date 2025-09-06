// src/lib/api.js

// If VITE_API_URL is provided, use it (absolute calls).
// If not provided, use "" so calls are relative and go through the Vite proxy.
export const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Ensures we always prefix with /api when using relative paths
function toUrl(path) {
  // allow callers to pass "/api/..." or just "auth/login"
  const p = path.startsWith("/api") ? path : `/api/${path.replace(/^\/+/, "")}`;
  return `${API}${p}`;
}

export async function apiPost(path, body) {
  const res = await fetch(toUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // keep cookies
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiGet(path) {
  const res = await fetch(toUrl(path), {
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiDelete(path) {
  const res = await fetch(toUrl(path), {
    method: "DELETE",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ----------------- NEW AUTH HELPERS -----------------
export const AuthAPI = {
  login: (body) => apiPost("/api/auth/login", body),
  register: (body) => apiPost("/api/auth/register", body),
  me: () => apiGet("/api/auth/me"),
  logout: () => apiPost("/api/auth/logout"),

  // Email verification endpoints
  verifyEmail: (body) => apiPost("/api/auth/verify-email", body),
  resendVerify: (body) => apiPost("/api/auth/verify-email/resend", body),

  // Forgot password flow (reuse existing backend endpoints if needed)
  forgotStart: (body) => apiPost("/api/auth/forgot/start", body),
  forgotVerify: (body) => apiPost("/api/auth/forgot/verify", body),
  forgotReset: (body) => apiPost("/api/auth/forgot/reset", body),
};
