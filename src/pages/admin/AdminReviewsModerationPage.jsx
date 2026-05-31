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
    <div className="admin-card">
      <h1 className="admin-card-title">Review Moderation</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-3 admin-select">
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
      <div className="mt-4 space-y-2">
        {items.map((r) => (
          <div key={r._id} className="admin-row p-3 text-sm">
            <div className="font-semibold text-gray-900">{r.productId?.title || "Product"} · {r.rating}★</div>
            <div className="text-xs text-gray-500">By {r.customerId?.email || "Customer"} · status: {r.moderationStatus}</div>
            <p className="mt-1 text-gray-600">{r.comment}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={async () => { await AdminAPI.moderateReview(r._id, "approve"); await load(); }} className="admin-btn admin-btn-sm admin-btn-success">
                Approve
              </button>
              <button onClick={async () => { await AdminAPI.moderateReview(r._id, "reject"); await load(); }} className="admin-btn admin-btn-sm admin-btn-warning">
                Reject
              </button>
              <button onClick={async () => { await AdminAPI.moderateReview(r._id, "delete"); await load(); }} className="admin-btn admin-btn-sm admin-btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="admin-muted">No reviews found.</p>}
      </div>
    </div>
  );
}
