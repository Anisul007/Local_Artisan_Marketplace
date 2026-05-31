import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminProfilePage() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    displayName: "",
    phone: "",
    department: "",
    bio: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const r = await AdminAPI.getProfile().catch(() => null);
      if (mounted && r?.ok) {
        const d = r?.data?.data || r?.data || {};
        setForm({
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          email: d.email || "",
          displayName: d.adminProfile?.displayName || "",
          phone: d.adminProfile?.phone || "",
          department: d.adminProfile?.department || "",
          bio: d.adminProfile?.bio || "",
        });
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setErr("");
    const r = await AdminAPI.updateProfile(form).catch(() => null);
    if (!r?.ok) {
      setErr(r?.data?.message || "Could not update admin profile");
      setSaving(false);
      return;
    }
    if (r?.data?.user) signIn(r.data.user);
    setMsg("Admin profile updated.");
    setSaving(false);
  }

  if (loading) {
    return <div className="h-28 animate-pulse rounded-xl bg-gray-100" />;
  }

  return (
    <form onSubmit={submit} className="admin-card">
      <h1 className="admin-card-title">Admin Profile</h1>
      <p className="mt-1 text-sm text-gray-600">Manage your admin identity and contact details.</p>

      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="First name" value={form.firstName} onChange={(v) => setForm((p) => ({ ...p, firstName: v }))} />
        <Field label="Last name" value={form.lastName} onChange={(v) => setForm((p) => ({ ...p, lastName: v }))} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
        <Field label="Display name" value={form.displayName} onChange={(v) => setForm((p) => ({ ...p, displayName: v }))} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
        <Field label="Department" value={form.department} onChange={(v) => setForm((p) => ({ ...p, department: v }))} />
      </div>
      <label className="mt-3 block text-sm font-semibold text-gray-700">
        Bio
        <textarea
          value={form.bio}
          onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          rows={4}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 admin-btn admin-btn-md admin-btn-brand hover:bg-indigo-500 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900"
      />
    </label>
  );
}
