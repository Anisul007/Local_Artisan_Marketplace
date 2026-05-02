import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminGlobalPromotionsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    name: "",
    type: "percentage",
    value: 10,
    code: "",
    startDate: "",
    endDate: "",
    featuredCampaign: false,
  });

  async function load() {
    const r = await AdminAPI.globalPromotions().catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
        <h1 className="text-xl font-bold text-white">Platform Promotions</h1>
        <p className="mt-1 text-sm text-slate-300">Create site-wide coupons and seasonal campaigns.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Campaign name" className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-400" />
          <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Coupon code" className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-400" />
          <input value={String(form.value)} onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value || 0) }))} placeholder="Value" className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-400" />
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount</option>
          </select>
          <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100" />
          <input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100" />
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={form.featuredCampaign} onChange={(e) => setForm((p) => ({ ...p, featuredCampaign: e.target.checked }))} />
          Featured homepage campaign
        </label>
        <button
          onClick={async () => {
            await AdminAPI.createGlobalPromotion(form);
            setForm({ name: "", type: "percentage", value: 10, code: "", startDate: "", endDate: "", featuredCampaign: false });
            await load();
          }}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Create global promotion
        </button>
      </div>

      <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
        <h2 className="text-lg font-semibold text-white">Current Global Promotions</h2>
        <div className="mt-3 space-y-2">
          {items.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center justify-between rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm">
              <div>
                <div className="font-semibold text-white">{p.name}</div>
                <div className="text-xs text-slate-400">
                  {p.code} · {p.type} {p.value} · {p.active ? "Active" : "Inactive"} {p.featuredCampaign ? "· Featured" : ""}
                </div>
              </div>
              <button onClick={async () => { await AdminAPI.deleteGlobalPromotion(p._id); await load(); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
                Delete
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-400">No global promotions.</p>}
        </div>
      </div>
    </div>
  );
}
