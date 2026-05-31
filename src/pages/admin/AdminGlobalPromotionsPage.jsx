import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

const money = (cents) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "AUD" }).format((Number(cents) || 0) / 100);

function promoLabel(p) {
  if (p.type === "percentage") return `${p.value}% off`;
  return `${money(p.value)} off`;
}

function vendorName(p) {
  const v = p.vendor;
  if (!v) return "Vendor";
  return [v.firstName, v.lastName].filter(Boolean).join(" ").trim() || v.email || "Vendor";
}

export default function AdminGlobalPromotionsPage() {
  const [vendorItems, setVendorItems] = useState([]);
  const [vendorFilter, setVendorFilter] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState({});
  const [globalItems, setGlobalItems] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "percentage",
    value: 10,
    code: "",
    startDate: "",
    endDate: "",
    featuredCampaign: false,
  });

  async function loadVendor() {
    const r = await AdminAPI.vendorPromotions(vendorFilter).catch(() => null);
    if (!r?.ok) {
      setErr(r?.data?.message || "Could not load vendor promotions");
      return;
    }
    const d = r?.data?.data ?? r?.data ?? {};
    setVendorItems(Array.isArray(d.items) ? d.items : []);
  }

  async function loadGlobal() {
    const r = await AdminAPI.globalPromotions().catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setGlobalItems(Array.isArray(d.items) ? d.items : []);
  }

  async function load() {
    setErr("");
    await Promise.all([loadVendor(), loadGlobal()]);
  }

  useEffect(() => {
    loadVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorFilter]);

  useEffect(() => {
    loadGlobal();
  }, []);

  async function moderate(id, decision) {
    setErr("");
    const r = await AdminAPI.moderateVendorPromotion(id, decision, reviewNotes[id] || "").catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Could not update promotion");
    setReviewNotes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await loadVendor();
    await loadGlobal();
  }

  return (
    <div className="space-y-5">
      <div className="admin-card">
        <h1 className="admin-card-title">Promotions</h1>
        <p className="mt-1 text-sm text-gray-600">
          Approve vendor discounts before they appear on the shop. Platform-wide coupons are created below and go live immediately.
        </p>
      </div>

      {err && <div className="admin-card text-sm text-red-700">{err}</div>}

      <div className="admin-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Vendor promotions — approval queue</h2>
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="admin-select">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {vendorItems.length === 0 ? (
            <p className="admin-muted">No vendor promotions in this queue.</p>
          ) : (
            vendorItems.map((p) => (
              <div
                key={p._id}
                className={`rounded-xl border p-4 ${
                  p.moderation?.status === "pending" || !p.moderation?.status
                    ? "border-l-4 border-l-amber-500 border-gray-200 bg-amber-50/40"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{p.name}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      {vendorName(p)} · {promoLabel(p)}
                      {p.code ? (
                        <span className="ml-2 rounded bg-white px-2 py-0.5 font-mono text-xs ring-1 ring-gray-200">{p.code}</span>
                      ) : (
                        <span className="ml-2 text-xs text-indigo-700">Automatic sale (no code)</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"} –{" "}
                      {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
                      {p.minPurchaseCents > 0 ? ` · Min ${money(p.minPurchaseCents)}` : ""}
                    </div>
                    <div className="mt-2">
                      <span className="admin-badge-warn text-xs normal-case">{p.moderation?.status || "pending"}</span>
                      {p.active ? (
                        <span className="ml-2 admin-badge-ok text-xs normal-case">Live</span>
                      ) : (
                        <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Not live</span>
                      )}
                    </div>
                  </div>
                </div>
                {(p.moderation?.status === "pending" || !p.moderation?.status) && (
                  <>
                    <textarea
                      value={reviewNotes[p._id] || ""}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [p._id]: e.target.value }))}
                      rows={2}
                      placeholder="Note to vendor (optional)…"
                      className="admin-textarea mt-3 w-full"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => moderate(p._id, "approve")} className="admin-btn admin-btn-sm admin-btn-success">
                        Approve
                      </button>
                      <button type="button" onClick={() => moderate(p._id, "reject")} className="admin-btn admin-btn-sm admin-btn-danger">
                        Reject
                      </button>
                    </div>
                  </>
                )}
                {p.moderation?.reviewNote ? (
                  <p className="mt-2 text-xs text-gray-600">Admin note: {p.moderation.reviewNote}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-card">
        <h2 className="text-lg font-semibold text-gray-900">Platform-wide promotions</h2>
        <p className="mt-1 text-sm text-gray-600">These coupons are active immediately (no vendor approval needed).</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Campaign name" className="admin-input" />
          <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Coupon code" className="admin-input" />
          <input value={String(form.value)} onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value || 0) }))} placeholder="Value" className="admin-input" />
          <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="admin-select">
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount</option>
          </select>
          <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="admin-select" />
          <input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="admin-select" />
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.featuredCampaign} onChange={(e) => setForm((p) => ({ ...p, featuredCampaign: e.target.checked }))} />
          Featured homepage campaign
        </label>
        <button
          onClick={async () => {
            const r = await AdminAPI.createGlobalPromotion(form);
            if (!r?.ok) return setErr(r?.data?.message || "Could not create promotion");
            setForm({ name: "", type: "percentage", value: 10, code: "", startDate: "", endDate: "", featuredCampaign: false });
            await loadGlobal();
          }}
          className="mt-3 admin-btn admin-btn-md admin-btn-brand"
        >
          Create global promotion
        </button>

        <div className="mt-6 space-y-2">
          {globalItems.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center justify-between admin-row px-3 py-2 text-sm">
              <div>
                <div className="font-semibold text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">
                  {p.code} · {promoLabel(p)} · {p.active ? "Active" : "Inactive"} {p.featuredCampaign ? "· Featured" : ""}
                </div>
              </div>
              <button onClick={async () => { await AdminAPI.deleteGlobalPromotion(p._id); await loadGlobal(); }} className="admin-btn admin-btn-sm admin-btn-danger">
                Delete
              </button>
            </div>
          ))}
          {globalItems.length === 0 && <p className="admin-muted">No global promotions.</p>}
        </div>
      </div>
    </div>
  );
}
