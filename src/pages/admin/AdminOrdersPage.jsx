import { useCallback, useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

const STATUSES = ["new", "accepted", "rejected", "in_progress", "processing", "shipped", "delivered", "completed", "cancelled"];

const STATUS_LABELS = {
  new: "New",
  accepted: "Accepted",
  rejected: "Rejected",
  in_progress: "In progress",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

const REFUND_NOTE_OPTIONS = [
  { value: "none", label: "No refund note" },
  { value: "requested", label: "Refund requested" },
  { value: "approved", label: "Refund approved" },
  { value: "declined", label: "Refund declined" },
  { value: "received", label: "Items returned" },
];

function statusLabel(status) {
  return STATUS_LABELS[status] || String(status || "").replace(/_/g, " ");
}

function roleLabel(fromRole) {
  if (fromRole === "vendor") return "Vendor";
  if (fromRole === "customer") return "Customer";
  if (fromRole === "system") return "Platform";
  return "System";
}

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "AUD" }).format((Number(cents) || 0) / 100);
}

function unwrapOrderPayload(r) {
  if (!r?.ok || !r.data) return { order: null, message: r?.data?.message || "Request failed" };
  const body = r.data;
  const order = body?.data !== undefined ? body.data : body;
  if (order && typeof order === "object" && (order._id || order.id)) {
    if (!order._id && order.id) return { order: { ...order, _id: order.id }, message: "" };
    return { order, message: "" };
  }
  return { order: null, message: body?.message || "Unexpected response" };
}

export default function AdminOrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [platformDraft, setPlatformDraft] = useState("");
  const [platformBusy, setPlatformBusy] = useState(false);
  const [platformErr, setPlatformErr] = useState("");

  const load = useCallback(async () => {
    const r = await AdminAPI.orders({ q, status }).catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(), 25_000);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    const onFocus = () => load();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  async function toggleExpand(rawId) {
    const id = String(rawId);
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setDetailError("");
      setPlatformDraft("");
      setPlatformErr("");
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    setDetail(null);
    setDetailError("");
    setPlatformDraft("");
    setPlatformErr("");
    const r = await AdminAPI.getOrder(id).catch(() => null);
    setDetailLoading(false);
    const { order, message } = unwrapOrderPayload(r);
    if (!order) {
      setDetailError(message || "Could not load order details.");
      return;
    }
    setDetail(order);
    setDetailError("");
    await load();
  }

  async function sendPlatformMessage() {
    if (!detail?._id) return;
    const text = String(platformDraft || "").trim();
    if (!text) return;
    setPlatformBusy(true);
    setPlatformErr("");
    const r = await AdminAPI.postOrderMessage(detail._id, text).catch(() => null);
    setPlatformBusy(false);
    if (!r?.ok) {
      setPlatformErr(r?.data?.message || "Could not send message.");
      return;
    }
    setPlatformDraft("");
    const r2 = await AdminAPI.getOrder(String(detail._id)).catch(() => null);
    const { order: refreshed } = unwrapOrderPayload(r2);
    if (refreshed) setDetail(refreshed);
    await load();
  }

  async function cancelOrder(id) {
    if (!window.confirm("Cancel this order? It will be marked as cancelled for everyone.")) return;
    await AdminAPI.cancelOrder(id);
    await load();
  }

  async function updateRefundNote(state) {
    if (!detail?._id) return;
    const r = await AdminAPI.updateReturn(detail._id, state).catch(() => null);
    if (!r?.ok) return;
    const r2 = await AdminAPI.getOrder(String(detail._id)).catch(() => null);
    const { order: refreshed } = unwrapOrderPayload(r2);
    if (refreshed) setDetail(refreshed);
    await load();
  }

  return (
    <div className="admin-card">
      <h1 className="admin-card-title">Orders</h1>
      <p className="mt-2 admin-muted">
        Open an order to read messages and reply. Use <strong className="text-gray-600">Contact Messages</strong> only for the public contact form.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order/customer..." className="admin-input" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((o) => {
          const oid = String(o._id);
          const attention =
            o.countsAsNewOrderDot || (o.issuesOpenCount > 0) || o.hasRecentVendorMessage;
          const expanded = expandedId === oid;
          return (
          <div
            key={oid}
            className={attention ? "admin-attention-row" : "admin-row"}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{o.orderNumber}</span>
                  <span className="admin-badge-muted text-[10px] normal-case">{statusLabel(o.status)}</span>
                </div>
                <div className="text-xs text-gray-500">{o.customer?.email || "—"} · {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {o.countsAsNewOrderDot && (
                    <span className="admin-badge-new normal-case" title="Counts toward sidebar until you open details">
                      New order
                    </span>
                  )}
                  {o.hasRecentVendorMessage && (
                    <span className="admin-badge-info normal-case" title="Vendor message in the last 7 days">
                      New vendor message
                    </span>
                  )}
                  {o.messagesCount > 0 && !o.hasRecentVendorMessage && (
                    <span className="admin-badge-muted normal-case">
                      {o.messagesCount} message{o.messagesCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {o.issuesOpenCount > 0 && (
                    <span className="admin-badge-warn normal-case" title="Open reported issues">
                      {o.issuesOpenCount} problem{o.issuesOpenCount === 1 ? "" : "s"} to review
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => toggleExpand(o._id)} className="admin-btn admin-btn-sm admin-btn-outline">
                  {expanded ? "Close" : "Open order"}
                </button>
                <select
                  value={o.status}
                  title="Change status"
                  onChange={async (e) => {
                    await AdminAPI.updateOrderStatus(o._id, e.target.value);
                    await load();
                  }}
                  className="admin-select h-8 px-2 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
                <button type="button" onClick={() => cancelOrder(o._id)} className="admin-btn admin-btn-sm admin-btn-danger">
                  Cancel order
                </button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 border-t border-gray-200 pt-3">
                {detailLoading && <p className="admin-muted">Loading…</p>}
                {detailError && !detailLoading && (
                  <p className="text-sm text-red-700">{detailError}</p>
                )}
                {!detailLoading && !detailError && detail && String(detail._id) === oid && (
                  <div className="space-y-4 text-sm">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="admin-section-title">Order summary</div>
                      <dl className="mt-2 grid gap-1 text-xs text-gray-600 md:grid-cols-2">
                        <div><span className="text-gray-500">Total</span> · <span className="text-gray-900">{money(detail.totalCents, detail.currency)}</span></div>
                        {detail.couponCode ? (
                          <div><span className="text-gray-500">Coupon</span> · <span className="text-gray-900">{detail.couponCode}</span> (−{money(detail.discountCents || 0, detail.currency)})</div>
                        ) : null}
                        <div><span className="text-gray-500">Customer</span> · <span className="text-gray-900">{detail.customer?.email || "—"}</span></div>
                        {detail.shipping?.fullName || detail.shipping?.line1 ? (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">Ship to</span> ·{" "}
                            <span className="text-gray-900">
                              {[detail.shipping?.fullName, detail.shipping?.line1, detail.shipping?.line2, detail.shipping?.city, detail.shipping?.state, detail.shipping?.postcode, detail.shipping?.country]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        ) : null}
                      </dl>
                      {Array.isArray(detail.items) && detail.items.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-gray-200 pt-2">
                          {detail.items.map((it) => (
                            <li key={it._id || `${it.title}-${it.quantity}`} className="flex flex-wrap justify-between gap-2 text-xs text-gray-700">
                              <span>{it.title} × {it.quantity}</span>
                              <span className="text-gray-500">{money((it.priceCents || 0) * (it.quantity || 1), it.currency || detail.currency)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Messages</div>
                      {Array.isArray(detail.messages) && detail.messages.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {detail.messages.map((m) => (
                            <li key={m._id || `${m.sentAt}-${m.text?.slice(0, 20)}`} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <div className="text-xs text-gray-500">
                                <span className="font-semibold text-gray-700">{roleLabel(m.fromRole)}</span>
                                {m.fromUser?.email ? ` · ${m.fromUser.email}` : ""}
                                {m.sentAt ? ` · ${new Date(m.sentAt).toLocaleString()}` : ""}
                              </div>
                              <p className="mt-1 text-gray-700 whitespace-pre-wrap">{m.text}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-gray-500">No messages on this order yet.</p>
                      )}
                    </div>

                    <div className="admin-panel-accent">
                      <div className="admin-section-title-brand">Message everyone</div>
                      <p className="mt-1 text-[11px] text-gray-600">
                        Visible on the order and emailed to the customer and vendor.
                      </p>
                      {platformErr ? <p className="mt-2 text-xs text-red-700">{platformErr}</p> : null}
                      <textarea
                        value={platformDraft}
                        onChange={(e) => setPlatformDraft(e.target.value)}
                        rows={3}
                        placeholder="e.g. Shipping delay, refund update, or clarification for everyone on this order…"
                        className="admin-textarea mt-2"
                      />
                      <button
                        type="button"
                        disabled={platformBusy || !platformDraft.trim()}
                        onClick={sendPlatformMessage}
                        className="admin-btn admin-btn-sm admin-btn-brand mt-2"
                      >
                        {platformBusy ? "Sending…" : "Send message"}
                      </button>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Refund note (internal)</div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        For your records only — does not process a refund or email anyone.
                      </p>
                      <select
                        value={detail.adminMeta?.returnStatus || "none"}
                        onChange={(e) => updateRefundNote(e.target.value)}
                        className="mt-2 h-9 w-full max-w-xs rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-900"
                      >
                        {REFUND_NOTE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {Array.isArray(detail.issues) && detail.issues.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Problems reported by vendor</div>
                        <ul className="mt-2 space-y-2">
                          {detail.issues.map((issue) => (
                            <li key={issue._id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-gray-600">
                              <span className="font-semibold text-amber-800">{issue.status}</span>
                              {issue.createdAt ? ` · ${new Date(issue.createdAt).toLocaleString()}` : ""}
                              <p className="mt-1 text-gray-700">{issue.description}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        })}
        {items.length === 0 && <p className="admin-muted">No orders found.</p>}
      </div>
    </div>
  );
}
