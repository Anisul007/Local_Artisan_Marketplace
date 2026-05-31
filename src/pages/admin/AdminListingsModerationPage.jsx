import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminListingsModerationPage() {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await AdminAPI.pendingListings().catch(() => null);
    if (!r?.ok) return setErr("Could not load pending listings");
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function moderate(id, decision) {
    setErr("");
    setMsg("");
    const r = await AdminAPI.moderateListing(id, decision, note[id] || "").catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Action failed");
    setMsg(`Listing ${decision}d. Vendor notified.`);
    await load();
  }

  return (
    <div className="admin-card">
      <h1 className="admin-card-title">Pending Listing Approval</h1>
      <p className="mt-1 text-sm text-gray-600">Review and approve/reject vendor listings before public visibility.</p>
      <p className="mt-1 admin-muted">
        Every listing here is <strong className="text-gray-700">pending moderation</strong> and matches the red count on <strong className="text-gray-700">Listing Approval</strong> in the sidebar.
      </p>
      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="admin-muted">No pending listings.</p>
        ) : (
          items.map((l) => (
            <div key={l._id} className="admin-pending-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="admin-badge-pending">Pending approval</span>
                    <span className="font-semibold text-gray-900">{l.title}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Vendor: {l.vendor?.firstName} {l.vendor?.lastName} ({l.vendor?.email})
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: l?.pricing?.currency || "AUD" }).format((l?.pricing?.priceCents || 0) / 100)}
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">{l.description}</p>
              <textarea
                value={note[l._id] || ""}
                onChange={(e) => setNote((p) => ({ ...p, [l._id]: e.target.value }))}
                rows={2}
                placeholder="Optional review note..."
                className="admin-textarea mt-2"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={() => moderate(l._id, "approve")} className="admin-btn admin-btn-sm admin-btn-success">
                  Approve
                </button>
                <button onClick={() => moderate(l._id, "reject")} className="admin-btn admin-btn-sm admin-btn-danger">
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
