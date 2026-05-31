import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

const money = (cents, currency = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format((Number(cents) || 0) / 100);

const REFUND_LABELS = {
  none: "No refund action",
  requested: "Refund needed",
  approved: "Refund approved",
  declined: "Refund declined",
  processed: "Refund completed",
};

const ORDER_STATUS_LABELS = {
  cancelled: "Cancelled",
  rejected: "Rejected",
  new: "New",
  accepted: "Accepted",
  in_progress: "In progress",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
};

function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || status || "—";
}

export default function AdminPaymentsPage() {
  const [filter, setFilter] = useState("needs_refund");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);

  async function load() {
    const r = await AdminAPI.payments({ filter, status: filter === "all" ? status : "" }).catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, status]);

  const showRefundActions = (p) => {
    const orderStatus = p.order?.status;
    const needsOrderRefund = orderStatus === "cancelled" || orderStatus === "rejected";
    const inRefundFlow = ["requested", "approved"].includes(p.refundStatus);
    return p.status === "paid" && (needsOrderRefund || inRefundFlow);
  };

  return (
    <div className="admin-card">
      <h1 className="admin-card-title">Payments & refunds</h1>
      <p className="mt-2 admin-muted">
        Refunds are usually needed when an order was <strong className="text-gray-600">cancelled</strong> or{" "}
        <strong className="text-gray-600">rejected</strong> after the customer already paid.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            if (e.target.value !== "all") setStatus("");
          }}
          className="admin-select"
        >
          <option value="needs_refund">Needs refund (cancelled / rejected)</option>
          <option value="all">All transactions</option>
        </select>
        {filter === "all" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
            <option value="">Any payment status</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {items.map((p) => {
          const refundActions = showRefundActions(p);
          return (
            <div key={p._id} className="admin-row p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900">{p.order?.orderNumber || p.gatewayReference || p._id}</div>
                  <div className="text-xs text-gray-500">
                    {p.customer?.email || "—"}
                    {p.order?.status ? ` · Order: ${orderStatusLabel(p.order.status)}` : ""}
                    {` · Payment: ${p.status}`}
                    {p.refundStatus && p.refundStatus !== "none" ? ` · ${REFUND_LABELS[p.refundStatus] || p.refundStatus}` : ""}
                  </div>
                </div>
                <div className="font-semibold text-gray-900">{money(p.amountCents, p.currency || "AUD")}</div>
              </div>
              {refundActions ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await AdminAPI.refundDecision(p._id, "approve", "Approved by admin");
                      await load();
                    }}
                    className="admin-btn admin-btn-sm admin-btn-brand"
                  >
                    Approve refund
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await AdminAPI.refundDecision(p._id, "process", "Refund sent to customer");
                      await load();
                    }}
                    className="admin-btn admin-btn-sm admin-btn-success"
                  >
                    Mark as refunded
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await AdminAPI.refundDecision(p._id, "decline", "No refund");
                      await load();
                    }}
                    className="admin-btn admin-btn-sm admin-btn-danger"
                  >
                    No refund
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-500">No refund action needed for this payment.</p>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="admin-muted">
            {filter === "needs_refund"
              ? "No refunds waiting. Cancelled or rejected orders with a payment will show here."
              : "No payment records found."}
          </p>
        )}
      </div>
    </div>
  );
}
