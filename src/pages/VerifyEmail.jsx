// src/pages/VerifyEmail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Try to use your centralized AuthAPI; if missing, use a local fallback.
let AuthAPI = null;
try {
  ({ AuthAPI } = await import("../lib/api")); // expects verifyEmail({email,code}) & resendVerify({email})
} catch (_) {
  const API_BASE = (import.meta.env?.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
  const toUrl = (p) => `${API_BASE}${p.startsWith("/api") ? p : `/api/${p.replace(/^\/+/, "")}`}`;
  AuthAPI = {
    verifyEmail: async ({ email, code }) => {
      const res = await fetch(toUrl("/api/auth/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.message || "Verification failed");
        err.code = data?.code;
        err.body = data;
        throw err;
      }
      return data; // { ok:true, user }
    },
    resendVerify: async ({ email }) => {
      const res = await fetch(toUrl("/api/auth/verify-email/resend"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data?.message || "Resend failed");
        err.code = data?.code;
        err.body = data;
        throw err;
      }
      return data; // { ok:true }
    },
  };
}

// Server codes (keep in sync with backend)
const CODES = {
  CODE_INCORRECT: "ERR_CODE_INCORRECT",
  CODE_EXPIRED: "ERR_CODE_EXPIRED",
  NO_SESSION: "ERR_NO_VERIFY_SESSION",
  TOO_MANY_TRIES: "ERR_TOO_MANY_TRIES",
  REQUIRED: "ERR_REQUIRED",
};

const brand = {
  purple: "#4b0082",
  orange: "#ff6600",
  yellow: "#ffd166",
};

const BOXES = 6; // 6-character alphanumeric

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();

  const emailFromQuery = params.get("email") || "";
  const [email, setEmail] = useState(emailFromQuery);
  const [chars, setChars] = useState(Array(BOXES).fill(""));
  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [expiredBanner, setExpiredBanner] = useState(false); // show “unsuccessful” copy
  const inputsRef = useRef([]);

  // Focus first box on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Cooldown timer for resend (match backend 60s throttle)
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const code = useMemo(() => chars.join(""), [chars]);

  // Keep only 0-9 + letters, uppercase
  const normalizeChar = (c) => c.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 1);

  const onChangeBox = (idx, val) => {
    const v = normalizeChar(val);
    if (!v) {
      setChars((arr) => {
        const next = [...arr];
        next[idx] = "";
        return next;
      });
      setActive(idx);
      return;
    }
    setChars((arr) => {
      const next = [...arr];
      next[idx] = v;
      return next;
    });
    if (idx < BOXES - 1) {
      setActive(idx + 1);
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const onKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (chars[idx]) {
        setChars((arr) => {
          const next = [...arr];
          next[idx] = "";
          return next;
        });
        return;
      }
      if (idx > 0) {
        setActive(idx - 1);
        inputsRef.current[idx - 1]?.focus();
        setChars((arr) => {
          const next = [...arr];
          next[idx - 1] = "";
          return next;
        });
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      setActive(idx - 1);
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < BOXES - 1) {
      setActive(idx + 1);
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const onPaste = (e) => {
    const text = (e.clipboardData?.getData("text") || "").replace(/\s+/g, "");
    if (!text) return;
    e.preventDefault();
    const cleaned = text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, BOXES);
    if (!cleaned) return;
    const arr = Array(BOXES).fill("");
    for (let i = 0; i < cleaned.length; i++) arr[i] = cleaned[i];
    setChars(arr);
    const nextIndex = Math.min(cleaned.length, BOXES - 1);
    setActive(nextIndex);
    inputsRef.current[nextIndex]?.focus();
  };

  const humanError = (code) => {
    switch (code) {
      case CODES.CODE_INCORRECT:
        return "That code doesn’t match. Please try again.";
      case CODES.CODE_EXPIRED:
        return "Your code expired. Request a new one.";
      case CODES.NO_SESSION:
        return "No active verification session for this email. Try resending the code.";
      case CODES.TOO_MANY_TRIES:
        return "Too many attempts. Please request a new code in a bit.";
      case CODES.REQUIRED:
        return "Enter your email and the 6-character code.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const redirectByRole = (u) => {
    const isVendor = u?.isVendor || u?.role === "vendor" || u?.role === "seller";
    return isVendor ? "/vendor/dashboard" : "/products";
  };

  const submit = async () => {
    setError("");
    setExpiredBanner(false);
    if (!email || code.length !== BOXES) {
      setError(humanError(CODES.REQUIRED));
      return;
    }
    try {
      setSubmitting(true);
      const res = await AuthAPI.verifyEmail({ email, code });
      const user = res?.user || res?.data?.user;
      if (auth) {
        if (typeof auth.signIn === "function") auth.signIn(user);
        else if (typeof auth.setUser === "function") auth.setUser(user);
      }
      // Backend should send the “Registration successful / Welcome” email here.
      const dest = redirectByRole(user);
      navigate(dest, { replace: true });
    } catch (e) {
      const code = e?.code || e?.body?.code;
      setError(humanError(code));
      if (code === CODES.CODE_EXPIRED) setExpiredBanner(true);
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email) {
      setError("Enter your email to receive a code.");
      return;
    }
    try {
      setResending(true);
      setError("");
      await AuthAPI.resendVerify({ email });
      setCooldown(60); // match server throttle
      setExpiredBanner(false);
    } catch (_) {
      // stay quiet like backend; just show gentle copy
      setError("If the email exists, we’ve sent a new code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="relative min-h-[80vh] grid place-items-center bg-white overflow-hidden px-4">
      {/* subtle background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-28 w-[420px] h-[420px] rounded-full opacity-10"
          style={{ background: brand.purple }}
        />
        <div
          className="absolute -bottom-16 -right-24 w-[520px] h-[520px] rounded-full opacity-15"
          style={{ background: brand.yellow }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-white/90 backdrop-blur rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-extrabold text-center mb-2">Verify your email</h1>
        <p className="text-center text-sm text-gray-600">
          We’ve sent a 6-character code to <b>{email || "your email"}</b>. Enter it below (A–Z, 0–9).
        </p>

        {/* Registration unsuccessful banner for expired code */}
        {expiredBanner && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <b>Registration unsuccessful:</b> your code expired (10-minute limit). You can resend a new code
            or register again.
          </div>
        )}

        {/* Email (editable if user came without a query param) */}
        {!emailFromQuery && (
          <div className="mt-6">
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-300 px-3 outline-none focus:border-[color:var(--bp)] focus:ring-2 focus:ring-purple-100"
              placeholder="you@example.com"
              style={{ ["--bp"]: brand.purple }}
            />
          </div>
        )}

        {/* Code boxes */}
        <div className="mt-6">
          <label className="block text-sm font-semibold mb-2">Verification code</label>
          <div className="flex justify-between gap-2" onPaste={onPaste}>
            {Array.from({ length: BOXES }).map((_, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                inputMode="text"
                autoComplete="one-time-code"
                maxLength={1}
                value={chars[i]}
                onChange={(e) => onChangeBox(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="w-12 h-12 text-center text-xl rounded-xl border border-gray-300 outline-none focus:border-[color:var(--bp)] focus:ring-2 focus:ring-purple-100"
                style={{ ["--bp"]: brand.purple }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Tip: you can paste the whole 6-character code.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={resending || cooldown > 0}
            onClick={resend}
            className="rounded-xl px-4 h-11 border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || code.length !== BOXES || !email}
            className="rounded-xl px-5 h-11 font-semibold text-white shadow-sm disabled:opacity-70"
            style={{ background: brand.orange }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e65c00")}
            onMouseOut={(e) => (e.currentTarget.style.background = brand.orange)}
          >
            {submitting ? "Verifying…" : "Verify & continue"}
          </button>
        </div>

        {/* Helper links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Entered the wrong email?{" "}
          <a href="/register" className="underline font-medium" style={{ color: brand.purple }}>
            Create your account again
          </a>
          .
        </div>
      </div>
    </main>
  );
}

