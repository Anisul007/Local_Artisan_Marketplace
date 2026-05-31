import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminShippingPage() {
  const [form, setForm] = useState({
    methods: "standard,express",
    baseFeeCents: 1000,
    zones: "AU",
    courierNames: "Australia Post",
    deliveryRules: "",
    trackingControlEnabled: true,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const r = await AdminAPI.shippingSettings().catch(() => null);
      if (!r?.ok) return;
      const d = r?.data?.data ?? r?.data ?? {};
      setForm({
        methods: (d.methods || []).join(","),
        baseFeeCents: Number(d.baseFeeCents || 0),
        zones: (d.zones || []).join(","),
        courierNames: (d.courierNames || []).join(","),
        deliveryRules: d.deliveryRules || "",
        trackingControlEnabled: d.trackingControlEnabled !== false,
      });
    })();
  }, []);

  async function save() {
    await AdminAPI.updateShippingSettings({
      methods: form.methods.split(",").map((x) => x.trim()).filter(Boolean),
      baseFeeCents: Number(form.baseFeeCents || 0),
      zones: form.zones.split(",").map((x) => x.trim()).filter(Boolean),
      courierNames: form.courierNames.split(",").map((x) => x.trim()).filter(Boolean),
      deliveryRules: form.deliveryRules,
      trackingControlEnabled: !!form.trackingControlEnabled,
    });
    setMsg("Shipping settings saved.");
    setTimeout(() => setMsg(""), 1800);
  }

  return (
    <div className="admin-card">
      <h1 className="admin-card-title">Shipping Management</h1>
      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Shipping methods (comma separated)" value={form.methods} onChange={(v) => setForm((p) => ({ ...p, methods: v }))} />
        <Field label="Base fee (cents)" value={String(form.baseFeeCents)} onChange={(v) => setForm((p) => ({ ...p, baseFeeCents: Number(v || 0) }))} />
        <Field label="Zones (comma separated)" value={form.zones} onChange={(v) => setForm((p) => ({ ...p, zones: v }))} />
        <Field label="Couriers (comma separated)" value={form.courierNames} onChange={(v) => setForm((p) => ({ ...p, courierNames: v }))} />
      </div>
      <label className="mt-3 block text-sm font-semibold text-gray-700">
        Delivery rules
        <textarea value={form.deliveryRules} onChange={(e) => setForm((p) => ({ ...p, deliveryRules: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-900" />
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input type="checkbox" checked={form.trackingControlEnabled} onChange={(e) => setForm((p) => ({ ...p, trackingControlEnabled: e.target.checked }))} />
        Tracking control enabled
      </label>
      <button onClick={save} className="mt-4 admin-btn admin-btn-md admin-btn-brand">Save shipping settings</button>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400" />
    </label>
  );
}
