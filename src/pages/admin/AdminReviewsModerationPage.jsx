import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminReviewsModerationPage() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);

  async function load() {
    const r = await AdminAPI.reviews({ status }).catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <h1 className="text-xl font-bold text-white">Review Moderation</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-3 h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
      <div className="mt-4 space-y-2">
        {items.map((r) => (
          <div key={r._id} className="rounded-lg border border-white/15 bg-white/[0.03] p-3 text-sm">
            <div className="font-semibold text-white">{r.productId?.title || "Product"} · {r.rating}★</div>
            <div className="text-xs text-slate-400">By {r.customerId?.email || "Customer"} · status: {r.moderationStatus}</div>
            <p className="mt-1 text-slate-300">{r.comment}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={async () => { await AdminAPI.moderateReview(r._id, "approve"); await load(); }} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                Approve
              </button>
              <button onClick={async () => { await AdminAPI.moderateReview(r._id, "reject"); await load(); }} className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white">
                Reject
              </button>
              <button onClick={async () => { await AdminAPI.moderateReview(r._id, "delete"); await load(); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">No reviews found.</p>}
      </div>
    </div>
  );
}
