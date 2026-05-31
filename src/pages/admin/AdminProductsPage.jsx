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
    <div className="admin-card">
      <h1 className="admin-card-title">Admin Product Management</h1>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="admin-input" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => bulk("feature")} className="admin-btn admin-btn-sm admin-btn-brand">Feature selected</button>
          <button onClick={() => bulk("unpublish")} className="admin-btn admin-btn-sm admin-btn-warning">Unpublish selected</button>
          <button type="button" onClick={() => bulk("delete")} className="admin-btn admin-btn-sm admin-btn-danger">Delete selected</button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((p) => (
          <div key={p._id} className="admin-row p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!selected[p._id]} onChange={(e) => setSelected((x) => ({ ...x, [p._id]: e.target.checked }))} />
                <span className="font-semibold text-gray-900">{p.title}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => toggleFeatured(p._id, !p.isFeatured)} className="admin-btn admin-btn-sm admin-btn-outline">
                  {p.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button onClick={async () => { await AdminAPI.forceUnpublishProduct(p._id); await load(); }} className="admin-btn admin-btn-sm admin-btn-warning">
                  Force unpublish
                </button>
                <button onClick={async () => { await AdminAPI.removeProduct(p._id); await load(); }} className="admin-btn admin-btn-sm admin-btn-danger">
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Status: {p.inventory?.status || "—"} · Moderation: {p.moderation?.status || "—"} · Vendor: {p.vendor?.email || "—"}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="admin-muted">No products found.</p>}
      </div>
    </div>
  );
}
