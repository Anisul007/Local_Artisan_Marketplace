import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthAPI } from "../../lib/api";
import Modal from "../../components/ui/Modal";
import PasswordInput from "../../components/ui/PasswordInput";

function parseAddressText(raw = "") {
  const txt = String(raw || "").trim();
  if (!txt) return { line1: "", city: "", state: "", postcode: "" };
  const parts = txt.split(",").map((p) => p.trim()).filter(Boolean);
  const line1 = parts[0] || txt;
  const tail = parts.slice(1).join(" ");
  const postcode = (tail.match(/\b(\d{4})\b/) || [])[1] || "";
  const state = ((tail.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i) || [])[1] || "").toUpperCase();
  const city = tail.replace(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/gi, "").replace(/\b\d{4}\b/g, "").trim();
  return { line1, city, state, postcode };
}

export default function CustomerProfilePage() {
  const { user, loading, signIn } = useAuth();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [overview, setOverview] = useState(null); // { profile, passwordChanged }

  const initial = useMemo(() => {
    const structured = user?.shippingAddress || {};
    const parsed = parseAddressText(user?.address || "");
    return {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: structured.phone || "",
      line1: structured.line1 || parsed.line1 || "",
      line2: structured.line2 || "",
      city: structured.city || parsed.city || "",
      state: structured.state || parsed.state || "",
      postcode: structured.postcode || parsed.postcode || "",
      country: structured.country || "AU",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  }, [user]);

  const [form, setForm] = useState(initial);

  if (loading) return <main className="max-w-3xl mx-auto px-4 py-12"><div className="h-24 rounded-xl bg-gray-200 animate-pulse" /></main>;
  if (!user) return <Navigate to="/login?next=/account/profile" replace />;
  if (user.role === "vendor") return <Navigate to="/vendor/profile" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!form.firstName.trim() || !form.lastName.trim()) return setErr("First and last name are required.");
    if (!form.email.trim()) return setErr("Email is required.");
    const wantsPw = !!(form.currentPassword || form.newPassword || form.confirmPassword);
    if (wantsPw && (!form.currentPassword || !form.newPassword || !form.confirmPassword)) {
      return setErr("To change password, fill current, new and confirm fields.");
    }

    setSaving(true);
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      shippingAddress: {
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postcode: form.postcode.trim(),
        country: form.country.trim() || "AU",
        phone: form.phone.trim(),
      },
      address: [form.line1, form.city, form.state, form.postcode].map((v) => String(v || "").trim()).filter(Boolean).join(", "),
    };
    if (wantsPw) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
      payload.confirmPassword = form.confirmPassword;
    }
    const r = await AuthAPI.updateProfile(payload).catch(() => null);
    if (!r || !r.ok) {
      setSaving(false);
      setErr(r?.data?.message || "Could not update profile.");
      return;
    }
    const nextUser = r?.data?.user;
    if (nextUser) signIn(nextUser);
    setForm((s) => ({ ...s, currentPassword: "", newPassword: "", confirmPassword: "" }));

    const u = nextUser || {};
    const sa = u.shippingAddress || {};
    setOverview({
      passwordChanged: wantsPw,
      profile: {
        firstName: u.firstName ?? form.firstName.trim(),
        lastName: u.lastName ?? form.lastName.trim(),
        email: u.email ?? form.email.trim(),
        phone: sa.phone ?? u.phone ?? form.phone.trim(),
        line1: sa.line1 ?? form.line1.trim(),
        line2: sa.line2 ?? form.line2.trim(),
        city: sa.city ?? form.city.trim(),
        state: sa.state ?? form.state.trim(),
        postcode: sa.postcode ?? form.postcode.trim(),
        country: (sa.country ?? form.country.trim()) || "AU",
        addressLine:
          u.address ||
          [form.line1, form.city, form.state, form.postcode]
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .join(", "),
      },
    });
    setOverviewOpen(true);
    setSaving(false);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit profile</h1>
        <Link to="/account" className="text-sm font-semibold text-purple-700 hover:underline">Back to dashboard</Link>
      </div>

      {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} placeholder="First name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} placeholder="Last name" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
          <input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="Phone (AU)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h2 className="font-semibold text-gray-900 mb-3">Address</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.line1} onChange={(e) => setForm((s) => ({ ...s, line1: e.target.value }))} placeholder="Address line 1" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
            <input value={form.line2} onChange={(e) => setForm((s) => ({ ...s, line2: e.target.value }))} placeholder="Address line 2" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
            <input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} placeholder="City" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={form.state} onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))} placeholder="State" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={form.postcode} onChange={(e) => setForm((s) => ({ ...s, postcode: e.target.value }))} placeholder="Postcode" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} placeholder="Country" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h2 className="font-semibold text-gray-900 mb-3">Change password</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <PasswordInput
              value={form.currentPassword}
              onChange={(e) => setForm((s) => ({ ...s, currentPassword: e.target.value }))}
              placeholder="Current password"
              autoComplete="current-password"
              inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <PasswordInput
              value={form.newPassword}
              onChange={(e) => setForm((s) => ({ ...s, newPassword: e.target.value }))}
              placeholder="New password"
              autoComplete="new-password"
              inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <PasswordInput
              value={form.confirmPassword}
              onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
              placeholder="Confirm password"
              autoComplete="new-password"
              inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <button disabled={saving} className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-70">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <Modal open={overviewOpen} onClose={() => setOverviewOpen(false)}>
        {overview && (
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <span className="text-2xl font-bold">✓</span>
            </div>
            <h2 className="text-center text-xl font-bold text-gray-900">Profile updated</h2>
            <p className="mt-1 text-center text-sm text-gray-600">Here is your current profile overview.</p>

            <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</p>
                <p className="font-medium text-gray-900">
                  {overview.profile.firstName} {overview.profile.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                <p className="font-medium text-gray-900 break-all">{overview.profile.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{overview.profile.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shipping address</p>
                <p className="font-medium text-gray-900 whitespace-pre-line">
                  {(() => {
                    const p = overview.profile;
                    const parts = [];
                    if (p.line1) parts.push(p.line1);
                    if (p.line2) parts.push(p.line2);
                    const line3 = [p.city, p.state, p.postcode].filter(Boolean).join(", ");
                    if (line3) parts.push(line3);
                    if (p.country) parts.push(p.country);
                    if (parts.length) return parts.join("\n");
                    return p.addressLine || "—";
                  })()}
                </p>
              </div>
            </div>

            {overview.passwordChanged && (
              <p className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
                Your password was updated successfully.
              </p>
            )}

            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700"
              onClick={() => setOverviewOpen(false)}
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </main>
  );
}
