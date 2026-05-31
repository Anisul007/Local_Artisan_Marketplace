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
    <main className="admin-app admin-shell grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="admin-card w-full max-w-md p-8 shadow-lg">
        <p className="admin-brand-tag">Artisan Avenue</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Admin login</h1>
        <p className="mt-1 admin-muted">Secure access for platform administrators.</p>
        {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
        <label className="mt-4 block text-sm font-semibold text-gray-700">
          Admin email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="admin-input mt-1 h-11"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-semibold text-gray-700">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="admin-input mt-1 h-11"
            required
          />
        </label>
        <button type="submit" disabled={loading} className="admin-btn-primary mt-5 h-11 w-full">
          {loading ? "Signing in..." : "Login as admin"}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/" className="font-semibold text-[#4b0082] hover:underline">
            Back to storefront
          </Link>
        </p>
      </form>
    </main>
  );
}
