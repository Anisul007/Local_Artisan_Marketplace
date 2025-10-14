// src/lib/api.js

// Base URL
export const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Build /api URL safely (accepts "auth/login" or "/api/auth/login")
function toUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  const p =
    clean.startsWith("api/") || clean.startsWith("/api")
      ? `/${clean.replace(/^\/+/, "")}`
      : `/api/${clean}`;
  return `${API}${p}`;
}

// Small helper to build query strings safely
function qs(obj = {}) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : "";
}

// -------- generic HTTP helpers (JSON) ----------
async function json(method, path, body) {
  const res = await fetch(toUrl(path), {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const apiGet    = (path)            => json("GET",    path);
export const apiPost   = (path, body)      => json("POST",   path, body);
export const apiPut    = (path, body)      => json("PUT",    path, body);
export const apiPatch  = (path, body)      => json("PATCH",  path, body);
export const apiDelete = (path)            => json("DELETE", path);

// -------- uploads (FormData, no JSON headers) ----------
export async function apiUpload(path, formData /* FormData */) {
  const res = await fetch(toUrl(path), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ----------------- AUTH -----------------
export const AuthAPI = {
  // Both styles work: "auth/login" or "/api/auth/login" — toUrl handles either.
  login:        (body) => apiPost("auth/login", body),
  register:     (body) => apiPost("auth/register", body),
  me:                   () => apiGet("auth/me"),
  logout:               () => apiPost("auth/logout"),

  verifyEmail:  (body) => apiPost("auth/verify-email", body),
  resendVerify: (body) => apiPost("auth/verify-email/resend", body),

  forgotStart:  (body) => apiPost("auth/forgot/start", body),
  forgotVerify: (body) => apiPost("auth/forgot/verify", body),
  forgotReset:  (body) => apiPost("auth/forgot/reset", body),
};

// ---- Catalog (public) ----
export const PublicListingsAPI = {
  list: ({ q = "", category = "", page = 1, min = "", max = "" } = {}) =>
    apiGet(`listings${qs({ q, category, page, min, max })}`),
  read: (idOrSlug) => apiGet(`listings/${idOrSlug}`),

  // aliases (legacy)
  browse: ({ q = "", category = "", page = 1, min = "", max = "" } = {}) =>
    apiGet(`listings${qs({ q, category, page, min, max })}`),
  bySlug: (slug) => apiGet(`listings/${slug}`),
};

// ---- Categories (public) ----
export const CategoriesAPI = {
  all:  () => apiGet("categories"),
  list: () => apiGet("categories"), // alias
};

// ---- Vendor Listings (requires auth cookie) ----
export const ListingsAPI = {
  list:   (q = "", status = "", page = 1) =>
    apiGet(`vendor/listings${qs({ q, status, page })}`),
  read:   (id)            => apiGet(`vendor/listings/${id}`),
  create: (payload)       => apiPost(`vendor/listings`, payload),
  update: (id, payload)   => apiPut(`vendor/listings/${id}`, payload), // keep POST for compatibility
  // If you switch backend to PUT/PATCH later, just change to apiPut/apiPatch above.

  remove:    (id)         => apiDelete(`vendor/listings/${id}`),
  publish:   (id)         => apiPost(`vendor/listings/${id}/publish`, {}),
  setStatus: (id, status) => apiPost(`vendor/listings/${id}/status`, { status }),
};

// ---- Vendor Reviews (read-only for Sprint 2) ----
export const ReviewsAPI = {
  listMine: ({ productId = "", rating = "", page = 1, limit = 10 } = {}) =>
    apiGet(`vendor/reviews${qs({ productId, rating, page, limit })}`),
};

// ---- Uploads helper (used by ImageUploader.jsx) ----
export const UploadsAPI = {
  /**
   * files: FileList | File[]
   * Backend: POST /api/uploads -> { ok:true, urls:[...] }
   */
  async uploadFiles(files) {
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    return apiUpload("uploads", fd);
  },
};


export const VendorAPI = {
  getProfile: () => apiGet("/api/vendor/profile"),

  // JSON update (no file here)
  updateProfile: (payload) => apiPut("/api/vendor/profile", payload),

  // multipart upload for logo (returns { ok:true, data:{ url } })
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append("logo", file);
    return apiPost("/api/vendor/profile/logo", fd, { isMultipart: true });
  },
};

