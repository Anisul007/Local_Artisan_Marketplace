import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AdminAPI } from "../../lib/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await AdminAPI.login({ email, password }).catch(() => null);
    setLoading(false);
    if (!r?.ok) {
      setErr(r?.data?.message || "Invalid admin credentials");
      return;
    }
    signIn?.(r?.data?.user);
    navigate("/admin/dashboard", { replace: true });
  }

  return (
    <main className="min-h-[80vh] grid place-items-center bg-slate-950 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/70 p-8 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-white">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-300">Separate secure access for platform administrators.</p>
        {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
        <label className="mt-4 block text-sm font-semibold text-slate-200">
          Admin email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-1 h-11 w-full rounded-xl border border-white/20 bg-white/5 px-3 text-slate-100"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-semibold text-slate-200">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="mt-1 h-11 w-full rounded-xl border border-white/20 bg-white/5 px-3 text-slate-100"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 h-11 w-full rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Login as Admin"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-400">
          Looking for user login?{" "}
          <Link to="/login" className="font-semibold text-slate-200 underline">
            Go to user login
          </Link>
        </p>
      </form>
    </main>
  );
}
