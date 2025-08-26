import { useEffect, useMemo, useRef, useState } from "react";

/* ── Brand ─────────────────────────────────────────────────────────────── */
const brand = {
  purple: "#4b0082",
  orange: "#ff6600",
};

/* ── API base ──────────────────────────────────────────────────────────── */
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ── Helpers ───────────────────────────────────────────────────────────── */
const post = (path, body) =>
  fetch(`${API}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

/* ── Component ─────────────────────────────────────────────────────────── */
export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=reset, 4=done
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // step 2 (OTP)
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = useRef(Array.from({ length: 6 }, () => null));
  const [resetToken, setResetToken] = useState(null);
  const [cooldown, setCooldown] = useState(0); // resend timer

  // step 3 (new password)
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  /* Cooldown countdown */
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const stepTitle = useMemo(
    () =>
      ({
        1: "Forgot Password",
        2: "Verify Code",
        3: "Create New Password",
        4: "All Set!",
      }[step]),
    [step]
  );

  /* ── Actions ─────────────────────────────────────────────────────────── */

  async function start() {
    setMsg(null);
    setErr(null);
    if (!email) return setErr("Enter your email.");
    setSubmitting(true);
    const res = await post("forgot/start", { email });
    setSubmitting(false);
    if (res.ok && res.data.ok) {
      setStep(2);
      setMsg("We sent a 6‑digit code to your email.");
      setCooldown(30);
      setTimeout(() => inputs.current[0]?.focus(), 60);
    } else {
      setErr(res?.data?.message || "Something went wrong. Try again.");
    }
  }

  function onCodeChange(i, v) {
    if (!/^\d?$/.test(v)) return; // allow one digit
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  }

  function onCodeKeyDown(i, e) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function onCodePaste(e) {
    const txt = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (txt.length) {
      const arr = Array.from({ length: 6 }, (_, k) => txt[k] || "");
      setCode(arr);
      const last = Math.min(5, txt.length - 1);
      setTimeout(() => inputs.current[last]?.focus(), 0);
      e.preventDefault();
    }
  }

  async function resend() {
    if (cooldown) return;
    setMsg(null); setErr(null);
    setSubmitting(true);
    const res = await post("forgot/start", { email });
    setSubmitting(false);
    if (res.ok && res.data.ok) {
      setMsg("Code re‑sent. Check your inbox.");
      setCooldown(30);
    } else {
      setErr("Could not resend. Try again later.");
    }
  }

  async function verify() {
    setMsg(null);
    setErr(null);
    const pin = code.join("");
    if (pin.length !== 6) return setErr("Enter the 6‑digit code.");
    setSubmitting(true);
    const res = await post("forgot/verify", { email, code: pin });
    setSubmitting(false);
    if (res.ok && res.data.ok) {
      setResetToken(res.data.resetToken);
      setStep(3);
      setTimeout(() => document.getElementById("new-pass")?.focus(), 50);
    } else {
      const c = res.data?.code;
      if (c === "ERR_CODE_INCORRECT") setErr("Incorrect code. Try again.");
      else if (c === "ERR_CODE_EXPIRED") setErr("Code expired. Start again.");
      else if (c === "ERR_TOO_MANY_TRIES") setErr("Too many attempts. Please wait and try again.");
      else setErr("Verification failed.");
    }
  }

  async function doReset() {
    setMsg(null);
    setErr(null);
    const strong = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
    if (!strong) {
      return setErr("Password must be at least 8 characters and include a letter and a number.");
    }
    if (password !== confirm) return setErr("Passwords do not match.");
    setSubmitting(true);
    const res = await post("forgot/reset", { email, resetToken, password, confirm });
    setSubmitting(false);
    if (res.ok && res.data.ok) setStep(4);
    else setErr("Could not reset password. Please start again.");
  }

  /* ── UI ──────────────────────────────────────────────────────────────── */

  return (
    <main className="relative min-h-[100vh] overflow-hidden">
      {/* Background: soft gradient + floating blobs */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at -10% 0%, rgba(75,0,130,.15), transparent 60%), radial-gradient(800px 500px at 110% 100%, rgba(255,102,0,.15), transparent 55%), linear-gradient(180deg,#ffffff 0%, #fafafa 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-20 animate-pulse"
        style={{ background: brand.purple }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-20 animate-[pulse_3s_ease-in-out_infinite]"
        style={{ background: brand.orange }}
      />

      {/* Card */}
      <section className="relative z-10 grid place-items-center px-4 py-14">
        <div className="w-full max-w-xl bg-white/90 backdrop-blur rounded-2xl shadow-2xl p-6 md:p-8 animate-[fadeIn_.4s_ease]">
          {/* Stepper */}
          <div className="mb-6 flex items-center justify-between text-xs font-semibold tracking-wide text-gray-600">
            {["Email", "Verify", "Reset", "Done"].map((label, i) => {
              const s = i + 1;
              const active = step >= s;
              return (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
                      active
                        ? "bg-purple-50 text-[color:var(--p)] border-[color:var(--p)]"
                        : "bg-gray-50 text-gray-400 border-gray-300"
                    }`}
                    style={{ ["--p"]: brand.purple }}
                  >
                    {s}
                  </span>
                  <span className={`${active ? "text-gray-900" : ""}`}>{label}</span>
                </div>
              );
            })}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold">{stepTitle}</h1>
          <p className="text-gray-600 mt-1">
            {step === 1 && "Enter your account email to receive a 6‑digit code."}
            {step === 2 && "Enter the 6‑digit code we sent to your email."}
            {step === 3 && "Create a new password."}
            {step === 4 && "Your password has been reset successfully."}
          </p>

          {msg && (
            <div className="mt-3 rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2 border border-green-200">
              {msg}
            </div>
          )}
          {err && (
            <div className="mt-3 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 border border-red-200">
              {err}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <div className="mt-6 grid gap-4">
              <label className="text-sm font-semibold">Email</label>
              <input
                type="email"
                className="h-11 rounded-xl border border-gray-300 px-3 outline-none focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"
                style={{ ["--br"]: brand.purple }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && start()}
              />
              <button
                onClick={start}
                disabled={submitting}
                className="h-11 rounded-xl text-white font-semibold shadow-sm transition"
                style={{ background: brand.orange }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#e65c00")}
                onMouseOut={(e) => (e.currentTarget.style.background = brand.orange)}
              >
                {submitting ? "Sending..." : "Send code"}
              </button>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="mt-6 grid gap-4">
              <div
                className="flex gap-3 justify-between"
                onPaste={onCodePaste}
                aria-label="6-digit verification code"
              >
                {code.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputs.current[i] = el)}
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => onCodeChange(i, e.target.value)}
                    onKeyDown={(e) => onCodeKeyDown(i, e)}
                    className="w-12 h-12 text-center text-xl rounded-xl border border-gray-300 focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100 outline-none"
                    style={{ ["--br"]: brand.purple }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={verify}
                  disabled={submitting}
                  className="h-11 px-5 rounded-xl text-white font-semibold shadow-sm transition"
                  style={{ background: brand.orange }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#e65c00")}
                  onMouseOut={(e) => (e.currentTarget.style.background = brand.orange)}
                >
                  {submitting ? "Verifying..." : "Verify code"}
                </button>

                <button
                  type="button"
                  onClick={resend}
                  disabled={!!cooldown}
                  className={`text-sm underline ${
                    cooldown ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:text-gray-900"
                  }`}
                  title={cooldown ? `Resend available in ${cooldown}s` : "Resend code"}
                >
                  {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>

              <button className="text-sm underline text-gray-600" onClick={() => setStep(1)}>
                Change email
              </button>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-semibold">New password</label>
                <input
                  id="new-pass"
                  type="password"
                  className="w-full h-11 rounded-xl border border-gray-300 px-3 outline-none focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"
                  style={{ ["--br"]: brand.purple }}
                  placeholder="Min 8 chars with letters & numbers"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Confirm password</label>
                <input
                  type="password"
                  className="w-full h-11 rounded-xl border border-gray-300 px-3 outline-none focus:border-[color:var(--br)] focus:ring-2 focus:ring-purple-100"
                  style={{ ["--br"]: brand.purple }}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doReset()}
                />
              </div>
              <button
                onClick={doReset}
                disabled={submitting}
                className="h-11 rounded-xl text-white font-semibold shadow-sm transition"
                style={{ background: brand.orange }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#e65c00")}
                onMouseOut={(e) => (e.currentTarget.style.background = brand.orange)}
              >
                {submitting ? "Resetting..." : "Reset password"}
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="mt-6">
              <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-[color:var(--p)]"
                   style={{ ["--p"]: brand.purple }}>
                Your password has been updated.
              </div>
              <a
                href="/login"
                className="mt-4 inline-block rounded-xl px-4 py-2 text-white font-semibold"
                style={{ background: brand.purple }}
              >
                Go to Login
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

