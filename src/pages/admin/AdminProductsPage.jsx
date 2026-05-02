import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});

  async function load() {
    const r = await AdminAPI.products({ q, status }).catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  async function toggleFeatured(id, value) {
    await AdminAPI.updateProduct(id, { isFeatured: value });
    await load();
  }

  async function bulk(action) {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    await AdminAPI.bulkProducts(action, ids);
    setSelected({});
    await load();
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <h1 className="text-xl font-bold text-white">Admin Product Management</h1>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-400" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => bulk("feature")} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Feature selected</button>
          <button onClick={() => bulk("unpublish")} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Unpublish selected</button>
          <button onClick={() => bulk("delete")} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white">Delete selected</button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((p) => (
          <div key={p._id} className="rounded-lg border border-white/15 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!selected[p._id]} onChange={(e) => setSelected((x) => ({ ...x, [p._id]: e.target.checked }))} />
                <span className="font-semibold text-white">{p.title}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => toggleFeatured(p._id, !p.isFeatured)} className="rounded-lg border border-white/25 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-100">
                  {p.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button onClick={async () => { await AdminAPI.forceUnpublishProduct(p._id); await load(); }} className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white">
                  Force unpublish
                </button>
                <button onClick={async () => { await AdminAPI.removeProduct(p._id); await load(); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Status: {p.inventory?.status || "—"} · Moderation: {p.moderation?.status || "—"} · Vendor: {p.vendor?.email || "—"}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">No products found.</p>}
      </div>
    </div>
  );
}
