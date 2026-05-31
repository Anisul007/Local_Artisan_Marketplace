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
  updateProfile:(body) => apiPatch("auth/profile", body),
};

// ---- Catalog (public) ----
export const PublicListingsAPI = {
  list: ({ q = "", category = "", page = 1, min = "", max = "", sort = "", vendor = "" } = {}) =>
    apiGet(`listings${qs({ q, category, page, min, max, sort, vendor })}`),
  read: (idOrSlug) => apiGet(`listings/${idOrSlug}`),

  browse: ({ q = "", category = "", page = 1, min = "", max = "", sort = "", vendor = "" } = {}) =>
    apiGet(`listings${qs({ q, category, page, min, max, sort, vendor })}`),
  bySlug: (slug) => apiGet(`listings/${slug}`),
};

// ---- Categories (public) ----
export const CategoriesAPI = {
  all:  () => apiGet("categories"),
  list: () => apiGet("categories"), // alias
};

// ---- Public vendor storefront ----
export const PublicVendorsAPI = {
  list: (limit = 12) => apiGet(`vendors${qs({ limit })}`),
  get: (id) => apiGet(`vendors/${id}`),
  reviews: (id, { page = 1, limit = 10 } = {}) =>
    apiGet(`vendors/${id}/reviews${qs({ page, limit })}`),
};

// ---- Vendor Listings (requires auth cookie) ----
export const ListingsAPI = {
  list:   (q = "", status = "", page = 1, limit = "") =>
    apiGet(`vendor/listings${qs({ q, status, page, limit })}`),
  read:   (id)            => apiGet(`vendor/listings/${id}`),
  create: (payload)       => apiPost(`vendor/listings`, payload),
  update: (id, payload)   => apiPut(`vendor/listings/${id}`, payload), // keep POST for compatibility
  // If you switch backend to PUT/PATCH later, just change to apiPut/apiPatch above.

  remove:    (id)         => apiDelete(`vendor/listings/${id}`),
  publish:   (id)         => apiPost(`vendor/listings/${id}/publish`, {}),
  setStatus: (id, status) => apiPost(`vendor/listings/${id}/status`, { status }),
};

// ---- Vendor Promotions (auth required) ----
export const PromotionsAPI = {
  list: () => apiGet("vendor/promotions"),
  get: (id) => apiGet(`vendor/promotions/${id}`),
  create: (payload) => apiPost("vendor/promotions", payload),
  update: (id, payload) => apiPut(`vendor/promotions/${id}`, payload),
  delete: (id) => apiDelete(`vendor/promotions/${id}`),
};

// ---- Coupon validation (public, for cart/checkout) ----
export const validateCoupon = (code, cartItems) =>
  apiPost("promotions/validate", { code, items: cartItems });

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
  updateProfile: (payload) => apiPut("/api/vendor/profile", payload),
  uploadLogo: (file) => {
    const fd = new FormData();
    // Backend expects multer field name: uploadLogo.single("file")
    fd.append("file", file);
    return apiUpload("/api/vendor/profile/logo", fd);
  },
};

export const AdminAPI = {
  getProfile: () => apiGet("admin/profile"),
  updateProfile: (payload) => apiPut("admin/profile", payload),
  login: (body) => apiPost("auth/admin/login", body),
  dashboard: () => apiGet("admin/dashboard"),
  analyticsDetail: (metric, { months = 24 } = {}) => apiGet(`admin/analytics/${metric}${qs({ months })}`),
  notificationSummary: () => apiGet("admin/notifications/summary"),
  pendingListings: () => apiGet("admin/listings/pending"),
  moderateListing: (id, decision, note = "") => apiPatch(`admin/listings/${id}/moderate`, { decision, note }),
  vendors: ({ needsVerify = "", accountStatus = "" } = {}) => apiGet(`admin/vendors${qs({ needsVerify, accountStatus })}`),
  deactivateVendor: (id) => apiPatch(`admin/vendors/${id}/deactivate`, {}),
  reactivateVendor: (id) => apiPatch(`admin/vendors/${id}/reactivate`, {}),
  deleteVendor: (id) => apiDelete(`admin/vendors/${id}`),
  userDetail: (id) => apiGet(`admin/users/${id}`),
  abuseReports: (status = "") => apiGet(`admin/abuse-reports${qs({ status })}`),
  actionAbuseReport: (id, status, actionNote = "") => apiPatch(`admin/abuse-reports/${id}/action`, { status, actionNote }),
  contactMessages: (status = "") => apiGet(`admin/contact-messages${qs({ status })}`),
  respondContactMessage: (id, response) => apiPost(`admin/contact-messages/${id}/respond`, { response }),
  customers: ({ q = "", status = "", needsVerify = "" } = {}) => apiGet(`admin/customers${qs({ q, status, needsVerify })}`),
  customerOrders: (id) => apiGet(`admin/customers/${id}/orders`),
  blockCustomer: (id) => apiPatch(`admin/customers/${id}/block`, {}),
  unblockCustomer: (id) => apiPatch(`admin/customers/${id}/unblock`, {}),
  deleteCustomer: (id) => apiDelete(`admin/customers/${id}`),
  products: ({ q = "", status = "" } = {}) => apiGet(`admin/products${qs({ q, status })}`),
  updateProduct: (id, payload) => apiPatch(`admin/products/${id}`, payload),
  removeProduct: (id) => apiDelete(`admin/products/${id}`),
  forceUnpublishProduct: (id) => apiPatch(`admin/products/${id}/force-unpublish`, {}),
  bulkProducts: (action, ids) => apiPost("admin/products/bulk", { action, ids }),
  categories: () => apiGet("admin/categories"),
  createCategory: (payload) => apiPost("admin/categories", payload),
  updateCategory: (id, payload) => apiPatch(`admin/categories/${id}`, payload),
  deleteCategory: (id) => apiDelete(`admin/categories/${id}`),
  brands: () => apiGet("admin/brands"),
  createBrand: (payload) => apiPost("admin/brands", payload),
  updateBrand: (id, payload) => apiPatch(`admin/brands/${id}`, payload),
  deleteBrand: (id) => apiDelete(`admin/brands/${id}`),
  orders: ({ q = "", status = "" } = {}) => apiGet(`admin/orders${qs({ q, status })}`),
  getOrder: (id) => apiGet(`admin/orders/${id}`),
  postOrderMessage: (id, text) => apiPost(`admin/orders/${id}/messages`, { text }),
  updateOrderStatus: (id, status) => apiPatch(`admin/orders/${id}/status`, { status }),
  cancelOrder: (id) => apiPatch(`admin/orders/${id}/cancel`, {}),
  updateReturn: (id, state) => apiPatch(`admin/orders/${id}/return`, { state }),
  payments: ({ status = "", filter = "needs_refund" } = {}) => apiGet(`admin/payments${qs({ status, filter })}`),
  refundDecision: (id, decision, reason = "") => apiPatch(`admin/payments/${id}/refund`, { decision, reason }),
  shippingSettings: () => apiGet("admin/shipping-settings"),
  updateShippingSettings: (payload) => apiPut("admin/shipping-settings", payload),
  reviews: ({ status = "" } = {}) => apiGet(`admin/reviews${qs({ status })}`),
  moderateReview: (id, action, note = "") => apiPatch(`admin/reviews/${id}/moderate`, { action, note }),
  vendorPromotions: (status = "pending") => apiGet(`admin/promotions/vendor${qs({ status })}`),
  moderateVendorPromotion: (id, decision, reviewNote = "") =>
    apiPatch(`admin/promotions/vendor/${id}/moderate`, { decision, reviewNote }),
  globalPromotions: () => apiGet("admin/promotions/global"),
  createGlobalPromotion: (payload) => apiPost("admin/promotions/global", payload),
  updateGlobalPromotion: (id, payload) => apiPatch(`admin/promotions/global/${id}`, payload),
  deleteGlobalPromotion: (id) => apiDelete(`admin/promotions/global/${id}`),
  settings: () => apiGet("admin/settings"),
  updateSettings: (payload) => apiPut("admin/settings", payload),
  exportReportUrl: ({ format = "excel", from = "", to = "" } = {}) =>
    `${API}/api/admin/reports/export${qs({ format, from, to })}`,
};

export const ContactAPI = {
  createMessage: (body) => apiPost("contact-messages", body),
};

export const AbuseReportsAPI = {
  create: (body) => apiPost("abuse-reports", body),
  listMine: () => apiGet("abuse-reports/mine"),
};

// ---- Customer Orders (auth required) ----
export const OrdersAPI = {
  create: (body) => apiPost("orders", body),
  list: () => apiGet("orders"),
  get: (id) => apiGet(`orders/${id}`),
  sendMessage: (orderId, text) => apiPost(`orders/${orderId}/messages`, { text }),
};

export const CustomerNotificationsAPI = {
  notificationSummary: () => apiGet("customer/notifications/summary"),
  list: () => apiGet("customer/notifications"),
  markSeen: () => apiPost("customer/notifications/mark-seen"),
};

// ---- Vendor order workflow + analytics ----
export const VendorOrdersAPI = {
  notificationSummary: () => apiGet("vendor/notifications/summary"),
  notifications: () => apiGet("vendor/notifications"),
  markNotificationsSeen: () => apiPost("vendor/notifications/mark-seen"),
  list: ({ page = 1, limit = 20, status = "", q = "", sortBy = "date", sortDir = "desc" } = {}) =>
    apiGet(`vendor/orders${qs({ page, limit, status, q, sortBy, sortDir })}`),
  updateStatus: (orderId, status) => apiPatch(`vendor/orders/${orderId}/status`, { status }),
  sendMessage: (orderId, text) => apiPost(`vendor/orders/${orderId}/messages`, { text }),
  reportIssue: (orderId, description) => apiPost(`vendor/orders/${orderId}/issues`, { description }),
  analytics: ({ from = "", to = "" } = {}) => apiGet(`vendor/analytics${qs({ from, to })}`),
  issues: ({ status = "" } = {}) => apiGet(`vendor/issues${qs({ status })}`),
  exportReportUrl: ({ format = "csv", from = "", to = "" } = {}) =>
    `${API}/api/vendor/reports/export${qs({ format, from, to })}`,
};

// ---- Customer Reviews (auth for POST) ----
export const CustomerReviewsAPI = {
  create: (body) => apiPost("customer/reviews", body),
  list: (listingId, page = 1, limit = 10) =>
    apiGet(`customer/reviews${qs({ listingId, page, limit })}`),
  eligibility: (listingId) =>
    apiGet(`customer/reviews/eligibility${qs({ listingId })}`),
};

