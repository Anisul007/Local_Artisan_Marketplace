import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const r = await AdminAPI.settings().catch(() => null);
      if (!r?.ok) return;
      setSettings(r?.data?.data ?? r?.data ?? null);
    })();
  }, []);

  if (!settings) return <div className="h-24 animate-pulse rounded-xl bg-gray-100" />;

  async function save() {
    await AdminAPI.updateSettings(settings);
    setMsg("Settings saved.");
    setTimeout(() => setMsg(""), 2000);
  }

  return (
    <div className="admin-card">
      <h1 className="admin-card-title">System Settings</h1>
      {msg && <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Store name" value={settings.store?.name || ""} onChange={(v) => setSettings((p) => ({ ...p, store: { ...(p.store || {}), name: v } }))} />
        <Field label="Store logo URL" value={settings.store?.logoUrl || ""} onChange={(v) => setSettings((p) => ({ ...p, store: { ...(p.store || {}), logoUrl: v } }))} />
        <Field label="Contact email" value={settings.store?.contactEmail || ""} onChange={(v) => setSettings((p) => ({ ...p, store: { ...(p.store || {}), contactEmail: v } }))} />
        <Field label="Currency code" value={settings.currency?.code || ""} onChange={(v) => setSettings((p) => ({ ...p, currency: { ...(p.currency || {}), code: v } }))} />
        <Field label="Tax rate (%)" value={String(settings.tax?.defaultRatePct ?? 10)} onChange={(v) => setSettings((p) => ({ ...p, tax: { ...(p.tax || {}), defaultRatePct: Number(v || 0) } }))} />
        <Field label="Vendor commission (%)" value={String(settings.commissions?.vendorPct ?? 10)} onChange={(v) => setSettings((p) => ({ ...p, commissions: { ...(p.commissions || {}), vendorPct: Number(v || 0) } }))} />
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          checked={settings.maintenanceMode?.enabled || false}
          onChange={(e) => setSettings((p) => ({ ...p, maintenanceMode: { ...(p.maintenanceMode || {}), enabled: e.target.checked } }))}
        />
        Maintenance mode
      </label>
      <label className="mt-3 block text-sm font-semibold text-gray-700">
        Maintenance message
        <textarea
          value={settings.maintenanceMode?.message || ""}
          onChange={(e) => setSettings((p) => ({ ...p, maintenanceMode: { ...(p.maintenanceMode || {}), message: e.target.value } }))}
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-900"
        />
      </label>
      <button onClick={save} className="mt-4 admin-btn admin-btn-md admin-btn-brand">
        Save settings
      </button>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900" />
    </label>
  );
}
