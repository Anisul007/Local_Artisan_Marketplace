import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // <-- add useLocation
import Modal from "../components/ux/Modal";
import Reveal from "../components/ux/Reveal";

// Try to import your centralized API (AuthAPI.register). If missing, use a local fallback.
let AuthAPI = null;
try {
  // optional shape: AuthAPI.register(payload) -> { ok, message }
  ({ AuthAPI } = await import("../lib/api"));
} catch (_) {
  const API_BASE = (import.meta.env?.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const toUrl = (p) => `${API_BASE}${p.startsWith("/api") ? p : `/api/${p.replace(/^\/+/, "")}`}`;
  AuthAPI = {
    register: async (payload) => {
      const res = await fetch(toUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.message || "Register failed");
        err.code = data?.code;
        err.body = data;
        throw err;
      }
      return data; // { ok:true, message:"..." }
    },
  };
}

// Brand palette (match your site)
const brand = {
  purple: "#4b0082",
  orange: "#ff6600", // homepage orange
};

// Centralized error codes (mirror server)
export const REGISTER_ERROR_CODES = {
  REQUIRED: "ERR_REQUIRED",
  INVALID_EMAIL: "ERR_INVALID_EMAIL",
  INVALID_PHONE_AU: "ERR_INVALID_PHONE_AU",
  PASSWORD_WEAK: "ERR_PASSWORD_WEAK",
  PASSWORD_MISMATCH: "ERR_PASSWORD_MISMATCH",
  EMAIL_TAKEN: "ERR_EMAIL_TAKEN",
};

const ALL_CATEGORIES = [
  "Art & Prints",
  "Body & Beauty",
  "Fashion",
  "Home",
  "Jewellery",
  "Kids",
  "Occasion",
  "Pantry",
  "Pets",
];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// AU phone numbers: 04XXXXXXXX or +61 4XXXXXXXX (mobile) and 0[2|3|7|8] for landline
const isAuPhone = (v) => {
  const val = (v || "").replace(/\s+/g, "");
  const mobile = /^(\+?61|0)4\d{8}$/;
  const land = /^(\+?61|0)(2|3|7|8)\d{8}$/;
  return mobile.test(val) || land.test(val);
};

const passwordChecks = {
  length: (v) => (v || "").length >= 8,
  letter: (v) => /[A-Za-z]/.test(v || ""),
  number: (v) => /\d/.test(v || ""),
};

function PasswordMeter({ value, color = brand.purple }) {
  const score = useMemo(() => {
    let s = 0;
    if (passwordChecks.length(value)) s += 1;
    if (passwordChecks.letter(value)) s += 1;
    if (passwordChecks.number(value)) s += 1;
    return s; // 0-3
  }, [value]);

  return (
    <div className="mt-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${(score / 3) * 100}%`,
            background: score < 2 ? "#ef4444" : score === 2 ? "#f59e0b" : color,
          }}
        />
      </div>
      <ul className="mt-2 grid gap-1 text-xs text-gray-600">
        <li className={passwordChecks.length(value) ? "text-green-600" : ""}>
          • At least 8 characters
        </li>
        <li className={passwordChecks.letter(value) ? "text-green-600" : ""}>
          • Contains a letter (A–Z or a–z)
        </li>
        <li className={passwordChecks.number(value) ? "text-green-600" : ""}>
          • Contains a number (0–9)
        </li>
      </ul>
    </div>
  );
}

// Small pill/checkbox component for multi-select categories
function CategoryPill({ label, active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-sm border transition ${
        active
          ? "bg-[var(--br)] text-white border-[var(--br)] shadow"
          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
      style={{ ["--br"]: brand.purple }}
    >
      {label}
    </button>
  );
}

export default function Register() {
  const nav = useNavigate();
  const location = useLocation(); // <-- get location

  const [role, setRole] = useState("customer"); // "customer" | "vendor"

  // Shared
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [address, setAddress]     = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [agree, setAgree]         = useState(false);

  // Customer-only
  const [dob, setDob]             = useState("");

  // Vendor-only
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone]               = useState("");
  const [website, setWebsite]           = useState("");
  const [desc, setDesc]                 = useState("");
  // NEW: multi-select categories
  const [primaryCategories, setPrimaryCategories] = useState([]);
  const [logoFile, setLogoFile]         = useState(null); // optional (not sent yet)

  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  function toggleCategory(cat) {
    setPrimaryCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function validate() {
    const e = {};

    // Common required
    if (!firstName.trim()) e.firstName = REGISTER_ERROR_CODES.REQUIRED;
    if (!lastName.trim())  e.lastName  = REGISTER_ERROR_CODES.REQUIRED;
    if (!email.trim() || !isEmail(email)) e.email = REGISTER_ERROR_CODES.INVALID_EMAIL;
    if (!address.trim())   e.address   = REGISTER_ERROR_CODES.REQUIRED;

    // Password rules
    const strong =
      passwordChecks.length(password) &&
      passwordChecks.letter(password) &&
      passwordChecks.number(password);
    if (!strong) e.password = REGISTER_ERROR_CODES.PASSWORD_WEAK;
    if (confirm !== password) e.confirm = REGISTER_ERROR_CODES.PASSWORD_MISMATCH;

    // Role specifics
    if (role === "customer") {
      if (!dob) e.dob = REGISTER_ERROR_CODES.REQUIRED;
    } else {
      if (!businessName.trim()) e.businessName = REGISTER_ERROR_CODES.REQUIRED;
      if (!phone.trim() || !isAuPhone(phone)) e.phone = REGISTER_ERROR_CODES.INVALID_PHONE_AU;

      // At least one category for vendor
      if (!primaryCategories.length) e.primaryCategories = REGISTER_ERROR_CODES.REQUIRED;
      if (!desc.trim()) e.desc = REGISTER_ERROR_CODES.REQUIRED;
      // website optional, logo optional (not sent yet)
    }

    if (!agree) e.agree = REGISTER_ERROR_CODES.REQUIRED;

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function mapServerError(code) {
    switch (code) {
      case REGISTER_ERROR_CODES.INVALID_EMAIL:
        return { field: "email", msg: "Please enter a valid email address." };
      case REGISTER_ERROR_CODES.EMAIL_TAKEN:
        return { field: "email", msg: "Email is already registered." };
      case REGISTER_ERROR_CODES.INVALID_PHONE_AU:
        return { field: "phone", msg: "Enter a valid Australian number (e.g. 04XXXXXXXX or +61 4XXXXXXXX)." };
      case REGISTER_ERROR_CODES.PASSWORD_WEAK:
        return { field: "password", msg: "Password must be at least 8 characters and include a letter and a number." };
      case REGISTER_ERROR_CODES.PASSWORD_MISMATCH:
        return { field: "confirm", msg: "Passwords do not match." };
      case REGISTER_ERROR_CODES.REQUIRED:
      default:
        return { field: "form", msg: "Please check the form and try again." };
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    // Build payload for API
    const payload = {
      role,
      firstName,
      lastName,
      email,
      address,
      password,
      confirm,
    };

    if (role === "customer") {
      payload.dob = dob;
    } else {
      payload.businessName = businessName;
      payload.phone = phone;
      payload.website = website;
      payload.description = desc;

      // NEW: multi-select — send both for backward/forward compatibility
      payload.primaryCategories = primaryCategories;              // <-- new array field (preferred)
      payload.primaryCategory = primaryCategories[0] || "";       // <-- legacy single field (your current schema)
      // NOTE: logoFile is not sent here; backend expects JSON; we can add Multer later
    }

    try {
      setBusy(true);
      setErrors({});
      // call backend → backend sends the OTP email
      const res = await AuthAPI.register(payload);
      setBusy(false);

      if (res?.ok) {
        setSuccess(true); // show modal
        // redirect to verify page with email (10–12s window is handled server-side)
        setTimeout(() => {
          nav(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 500);
      } else {
        // fallback – treat as ok flow if server returned a message
        setSuccess(true);
        setTimeout(() => {
          nav(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 500);
      }
    } catch (err) {
      setBusy(false);
      const code = err?.code || err?.body?.code;
      if (code) {
        const { field, msg } = mapServerError(code);
        setErrors((prev) => ({ ...prev, [field]: code, form: msg }));
      } else {
        setErrors((prev) => ({ ...prev, form: err?.message || "Something went wrong. Please try again." }));
      }
    }
  }

  // Helper to show field errors as UI text
  const fieldError = (key, fallbackMsg) => {
    if (!errors[key]) return null;
    const map = {
      [REGISTER_ERROR_CODES.REQUIRED]: "This field is required.",
      [REGISTER_ERROR_CODES.INVALID_EMAIL]: "Please enter a valid email address.",
      [REGISTER_ERROR_CODES.INVALID_PHONE_AU]:
        "Enter a valid Australian number (e.g. 04XXXXXXXX or +61 4XXXXXXXX).",
      [REGISTER_ERROR_CODES.PASSWORD_WEAK]:
        "Password must be at least 8 characters and include a letter and a number.",
      [REGISTER_ERROR_CODES.PASSWORD_MISMATCH]:
        "Passwords do not match.",
      [REGISTER_ERROR_CODES.EMAIL_TAKEN]:
        "Email is already registered.",
    };
    return <p className="mt-1 text-xs text-red-600">{map[errors[key]] || fallbackMsg}</p>;
  };

  // Reset role-specific errors when switching role
  useEffect(() => setErrors({}), [role]);

  // Set role from query param if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlRole = params.get("role");
    if (urlRole === "vendor" || urlRole === "customer") {
      setRole(urlRole);
    }
  }, [location.search]);

  return (
    <main className="relative min-h-[90vh] bg-white">
      {/* subtle background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full opacity-10"
          style={{ background: brand.purple }}
        />
        <div
          className="absolute -bottom-24 -right-32 w-[520px] h-[520px] rounded-full opacity-10"
          style={{ background: brand.orange }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10">
        <Reveal>
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-6 md:p-8">
            <h1 className="text-3xl font-extrabold mb-6">Create Account</h1>

            {/* Global form error from server */}
            {errors.form && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.form}
              </div>
            )}

            {/* Role switch */}
            <div
              className="rounded-2xl border border-dashed p-4 mb-6 flex items-center gap-6"
              style={{ borderColor: "#e5e7eb" }}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === "customer"}
                  onChange={() => setRole("customer")}
                />
                <span>Customer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === "vendor"}
                  onChange={() => setRole("vendor")}
                />
                <span>Vendor</span>
              </label>
            </div>

            <form onSubmit={onSubmit} className="grid gap-5">
              {/* Names */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-sm">First Name *</label>
                  <input
                    className={`w-full h-11 rounded-xl border px-3 outline-none transition
                      ${errors.firstName ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                    style={{ ["--br"]: brand.purple }}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                  {fieldError("firstName")}
                </div>
                <div>
                  <label className="font-semibold text-sm">Last Name *</label>
                  <input
                    className={`w-full h-11 rounded-xl border px-3 outline-none transition
                      ${errors.lastName ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                    style={{ ["--br"]: brand.purple }}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                  {fieldError("lastName")}
                </div>
              </div>

              {/* Customer block */}
              {role === "customer" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-sm">Date of Birth *</label>
                    <input
                      type="date"
                      className={`w-full h-11 rounded-xl border px-3 outline-none transition
                        ${errors.dob ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                      style={{ ["--br"]: brand.purple }}
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      placeholder="dd/mm/yyyy"
                    />
                    {fieldError("dob")}
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Address *</label>
                    <input
                      className={`w-full h-11 rounded-xl border px-3 outline-none transition
                        ${errors.address ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                      style={{ ["--br"]: brand.purple }}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, City, State, Postcode"
                    />
                    {fieldError("address")}
                  </div>
                </div>
              )}

              {/* Vendor block */}
              {role === "vendor" && (
                <div className="grid gap-4 rounded-xl border bg-gray-50 p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-sm">Business Name *</label>
                      <input
                        className={`w-full h-11 rounded-xl border px-3 outline-none transition
                          ${errors.businessName ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                        style={{ ["--br"]: brand.purple }}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Your brand / shop name"
                      />
                      {fieldError("businessName")}
                    </div>
                    <div>
                      <label className="font-semibold text-sm">Phone (AU) *</label>
                      <input
                        className={`w-full h-11 rounded-xl border px-3 outline-none transition
                          ${errors.phone ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                        style={{ ["--br"]: brand.purple }}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="04XXXXXXXX or +61 4XXXXXXXX"
                      />
                      {fieldError("phone")}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-sm">Email *</label>
                      <input
                        className={`w-full h-11 rounded-xl border px-3 outline-none transition
                          ${errors.email ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                        style={{ ["--br"]: brand.purple }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@brand.com"
                      />
                      {fieldError("email")}
                    </div>
                    <div>
                      <label className="font-semibold text-sm">Website (optional)</label>
                      <input
                        className="w-full h-11 rounded-xl border border-gray-300 px-3 outline-none focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100 transition"
                        style={{ ["--br"]: brand.purple }}
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-sm">Address *</label>
                    <input
                      className={`w-full h-11 rounded-xl border px-3 outline-none transition
                        ${errors.address ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                      style={{ ["--br"]: brand.purple }}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, City, State, Postcode"
                    />
                    {fieldError("address")}
                  </div>

                  <div>
                    <label className="font-semibold text-sm">
                      Business Description (what do you make/sell?) *
                    </label>
                    <textarea
                      rows={4}
                      className={`w-full rounded-xl border px-3 py-2 outline-none transition
                        ${errors.desc ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                      style={{ ["--br"]: brand.purple }}
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      placeholder="Be descriptive about your handmade products"
                    />
                    {fieldError("desc")}
                  </div>

                  {/* NEW: Multi-select categories */}
                  <div>
                    <label className="font-semibold text-sm">Categories *</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ALL_CATEGORIES.map((c) => (
                        <CategoryPill
                          key={c}
                          label={c}
                          active={primaryCategories.includes(c)}
                          onToggle={() => toggleCategory(c)}
                        />
                      ))}
                    </div>
                    {errors.primaryCategories && (
                      <p className="mt-1 text-xs text-red-600">Pick at least one category.</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      You can choose multiple categories (e.g. “Home” and “Jewellery”).
                    </p>
                  </div>

                  <div>
                    <label className="font-semibold text-sm">Business Logo / Profile (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm"
                    />
                    {/* Not uploaded yet - backend expects JSON; we can add Multer later */}
                  </div>
                </div>
              )}

              {/* Email (for customer role) */}
              {role === "customer" && (
                <div>
                  <label className="font-semibold text-sm">Email *</label>
                  <input
                    className={`w-full h-11 rounded-xl border px-3 outline-none transition
                      ${errors.email ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                    style={{ ["--br"]: brand.purple }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  {fieldError("email")}
                </div>
              )}

              {/* Passwords */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-sm">Create Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full h-11 rounded-xl border px-3 outline-none transition
                      ${errors.password ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                    style={{ ["--br"]: brand.purple }}
                    placeholder="Min 8 chars with letters & numbers"
                  />
                  <PasswordMeter value={password} />
                  {fieldError("password")}
                </div>
                <div>
                  <label className="font-semibold text-sm">Confirm Password *</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full h-11 rounded-xl border px-3 outline-none transition
                      ${errors.confirm ? "border-red-400" : "border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"}`}
                    style={{ ["--br"]: brand.purple }}
                    placeholder="Re-enter password"
                  />
                  {fieldError("confirm")}
                </div>
              </div>

              {/* Agree */}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={agree} onChange={() => setAgree((v) => !v)} />
                I agree to the <a href="/terms" className="underline">Terms</a> &{" "}
                <a href="/privacy" className="underline">Privacy</a>
              </label>
              {fieldError("agree", "Please agree to continue.")}

              {/* Submit */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 h-11 rounded-xl font-semibold text-white shadow-sm transition
                             disabled:opacity-70"
                  style={{ background: brand.orange }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#e65c00")}
                  onMouseOut={(e) => (e.currentTarget.style.background = brand.orange)}
                >
                  {busy ? "Creating account…" : "Create Account"}
                </button>
                <span className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <a href="/login" className="font-semibold underline">Sign in</a>
                </span>
              </div>
            </form>
          </div>
        </Reveal>
      </div>

      {/* Post-submit modal */}
      <Modal open={success} onClose={() => setSuccess(false)}>
        <div className="text-center">
          <div
            className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full"
            style={{ background: "#e9d5ff", color: brand.purple }}
          >
            ✓
          </div>
          <h3 className="text-xl font-bold mb-1">Check your email</h3>
          <p className="text-gray-600">
            We’ve sent a 6-character verification code to <b>{email}</b>. Enter it within 10 minutes to
            complete your registration.
          </p>
          <a
            href={`/verify-email?email=${encodeURIComponent(email)}`}
            className="mt-4 inline-block rounded-xl px-4 py-2 text-white font-semibold"
            style={{ background: brand.purple }}
          >
            Enter Code
          </a>
        </div>
      </Modal>
    </main>
  );
}


