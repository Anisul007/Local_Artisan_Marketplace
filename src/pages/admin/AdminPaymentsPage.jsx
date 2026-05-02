import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

const money = (cents, currency = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format((Number(cents) || 0) / 100);

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);

  async function load() {
    const r = await AdminAPI.payments({ status }).catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <h1 className="text-xl font-bold text-white">Payment & Refund Management</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-3 h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
        <option value="">All transactions</option>
        <option value="paid">Paid</option>
        <option value="failed">Failed</option>
        <option value="pending">Pending</option>
        <option value="refunded">Refunded</option>
      </select>
      <div className="mt-4 space-y-2">
        {items.map((p) => (
          <div key={p._id} className="rounded-lg border border-white/15 bg-white/[0.03] p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-white">{p.order?.orderNumber || p.gatewayReference || p._id}</div>
                <div className="text-xs text-slate-400">{p.customer?.email || "—"} · {p.status}</div>
              </div>
              <div className="font-semibold text-white">{money(p.amountCents, p.currency || "AUD")}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={async () => { await AdminAPI.refundDecision(p._id, "approve", "Approved by admin"); await load(); }} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">
                Approve refund
              </button>
              <button onClick={async () => { await AdminAPI.refundDecision(p._id, "process", "Processed refund"); await load(); }} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">
                Mark refunded
              </button>
              <button onClick={async () => { await AdminAPI.refundDecision(p._id, "decline", "Declined by admin"); await load(); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
                Decline refund
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">No payment records found.</p>}
      </div>
    </div>
  );
}
