// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "../components/ux/Modal";
import { useAuth } from "../context/AuthContext";
import { apiPost, apiGet } from "../lib/api";

// Keep these in sync with your backend
export const LOGIN_ERROR_CODES = {
  INVALID_EMAIL: "ERR_INVALID_EMAIL",
  INVALID_USERNAME: "ERR_INVALID_USERNAME",
  INVALID_PASSWORD: "ERR_INVALID_PASSWORD",
  AUTH_FAILED: "ERR_AUTH_FAILED",
  NOT_VERIFIED: "ERR_NOT_VERIFIED",
};

const BRAND = {
  primary: "#4b0082",   // purple
  accent:  "#ff6600",   // orange
  soft:    "#ffd166",   // yellow
};

// light client-side format checks
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isUsername = (v) => /^[a-zA-Z0-9_]{3,24}$/.test(v);

export default function Login() {
  const auth = useAuth();
  const setAuthUser = (u) => {
    if (!auth) return;
    if (typeof auth.signIn === "function") return auth.signIn(u);
    if (typeof auth.setUser === "function") return auth.setUser(u);
  };

  const navigate  = useNavigate();
  const location  = useLocation();

  // support redirect like /login?next=/checkout
  const searchParams = new URLSearchParams(location.search);
  const nextUrl = searchParams.get("next");

  const [user, setUser] = useState(localStorage.getItem("aa-last-user") || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(localStorage.getItem("aa-last-user")));

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [freshUser, setFreshUser] = useState(null);

  function validate() {
    const e = {};
    if (!user.trim()) {
      e.user = "Please enter your email or username.";
      e.code = LOGIN_ERROR_CODES.AUTH_FAILED;
    } else if (user.includes("@")) {
      if (!isEmail(user)) {
        e.user = "Please enter a valid email address.";
        e.code = LOGIN_ERROR_CODES.INVALID_EMAIL;
      }
    } else if (!isUsername(user)) {
      e.user = "Username must be 3–24 characters (letters, numbers, _ only).";
      e.code = LOGIN_ERROR_CODES.INVALID_USERNAME;
    }

    if (!password) {
      e.password = "Please enter your password.";
      e.code = e.code ?? LOGIN_ERROR_CODES.AUTH_FAILED;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function mapServerError(code) {
    switch (code) {
      case LOGIN_ERROR_CODES.INVALID_EMAIL:
        return "Invalid email format.";
      case LOGIN_ERROR_CODES.INVALID_USERNAME:
        return "Invalid username.";
      case LOGIN_ERROR_CODES.INVALID_PASSWORD:
        return "Invalid password.";
      case LOGIN_ERROR_CODES.NOT_VERIFIED:
        return "Your email isn’t verified yet.";
      case LOGIN_ERROR_CODES.AUTH_FAILED:
      default:
        return "Invalid credentials. Please try again.";
    }
  }

  // role-based destination
  function getDestination(u) {
    const role = u?.role;
    const isVendor = u?.isVendor || role === "vendor" || role === "seller";
    if (nextUrl) return nextUrl;                 // explicit redirect wins
    return isVendor ? "/vendor/dashboard" : "/"; // default routes
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});
    try {
      const r = await apiPost("/api/auth/login", { user, password }); // expects { ok:true, user? }
      if (r?.ok && r?.data?.ok) {
        if (remember) localStorage.setItem("aa-last-user", user);
        else localStorage.removeItem("aa-last-user");

        // hydrate user if missing role flags
        let u = r?.data?.user;
        if (!u || (u && !("role" in u) && !("isVendor" in u))) {
          const me = await apiGet("/api/auth/me"); // expects { ok:true, user }
          u = me?.data?.user || me?.user || u;
        }

        if (u) {
          setAuthUser(u);
          setFreshUser(u);
        }

        setSuccessOpen(true);
        // navigate immediately (keeps modal quick)
        navigate(getDestination(u), { replace: true });
        return;
      }

      const code = r?.data?.code || LOGIN_ERROR_CODES.AUTH_FAILED;

      if (r?.status === 403 && code === LOGIN_ERROR_CODES.NOT_VERIFIED) {
        // if user typed an email, send to verify
        if (user.includes("@") && isEmail(user)) {
          navigate(`/verify-email?email=${encodeURIComponent(user)}`);
          return;
        }
        setErrors({ form: "Your email isn’t verified yet. Please log in with your email to verify.", code });
        return;
      }

      setErrors({ form: mapServerError(code), code });
    } catch (err) {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[80vh] grid place-items-center bg-white overflow-hidden">
      {/* soft background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-32 w-[420px] h-[420px] rounded-full opacity-10" style={{ background: BRAND.primary }} />
        <div className="absolute -bottom-16 -right-24 w-[520px] h-[520px] rounded-full opacity-20" style={{ background: BRAND.soft }} />
        <svg className="absolute bottom-8 right-10 w-64 opacity-60" viewBox="0 0 400 120" fill="none">
          <path d="M0,80 C100,20 200,140 400,60" stroke={BRAND.primary} strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* card */}
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-extrabold text-center mb-6">Welcome back</h1>

        {errors.form && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.form}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Email or Username *</label>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className={`w-full h-11 rounded-xl border px-3 outline-none transition ${
                errors.user
                  ? "border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-gray-300 focus:border-[color:var(--brand)] focus:ring-2 focus:ring-purple-100"
              }`}
              placeholder="Enter your email or username"
              style={{ ["--brand"]: BRAND.primary }}
              autoComplete="username"
            />
            {errors.user && <p className="mt-1 text-xs text-red-600">{errors.user}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full h-11 rounded-xl border px-3 outline-none transition ${
                errors.password
                  ? "border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-gray-300 focus:border-[color:var(--brand)] focus:ring-2 focus:ring-purple-100"
              }`}
              placeholder="Enter your password"
              style={{ ["--brand"]: BRAND.primary }}
              autoComplete="current-password"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={() => setRemember((v) => !v)} />
              Remember me
            </label>
            <a href="/forgot" className="text-sm underline text-gray-600 hover:text-gray-900">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-xl font-semibold shadow-sm transition disabled:opacity-70"
            style={{ background: BRAND.accent, color: "#fff" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e65c00")}
            onMouseOut={(e) => (e.currentTarget.style.background = BRAND.accent)}
          >
            {submitting ? "Signing in…" : "Login"}
          </button>

          <p className="text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <a href="/register" className="font-semibold text-gray-900 underline">
              Sign up
            </a>
          </p>
        </form>
      </div>

      {/* success popup (non-blocking; we already navigated) */}
      <Modal open={successOpen} onClose={() => setSuccessOpen(false)}>
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full" style={{ background: "#e9d5ff", color: BRAND.primary }}>
            ✓
          </div>
          <h3 className="text-xl font-bold mb-1">Login successful</h3>
          <p className="text-gray-600">Welcome back!</p>
          <button
            className="mt-4 rounded-xl px-4 py-2 text-white font-semibold"
            style={{ background: BRAND.primary }}
            onClick={() => setSuccessOpen(false)}
          >
            Close
          </button>
        </div>
      </Modal>
    </main>
  );
}




