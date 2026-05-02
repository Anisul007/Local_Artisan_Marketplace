import { useCallback, useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

const STATUSES = ["new", "accepted", "rejected", "in_progress", "processing", "shipped", "delivered", "completed", "cancelled"];

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
      setPlatformErr(r?.data?.message || "Could not send platform message.");
      return;
    }
    setPlatformDraft("");
    const r2 = await AdminAPI.getOrder(String(detail._id)).catch(() => null);
    const { order: refreshed } = unwrapOrderPayload(r2);
    if (refreshed) setDetail(refreshed);
    await load();
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <h1 className="text-xl font-bold text-white">Platform Order Management</h1>
      <p className="mt-2 text-sm text-slate-400">
        <strong className="text-slate-300">Vendor ↔ customer messages</strong> on an order are stored on the order itself (not under Contact Messages).
        Expand an order below to read the full thread.{" "}
        <span className="text-slate-500">Contact Messages is only for the public “Contact Us” form.</span>
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order/customer..." className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-400" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
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
            className={`rounded-lg border p-3 ${
              attention ? "border-l-4 border-l-fuchsia-500 border-y border-r border-white/15 bg-fuchsia-500/[0.05]" : "border border-white/15 bg-white/[0.03]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{o.orderNumber}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">{o.status}</span>
                </div>
                <div className="text-xs text-slate-400">{o.customer?.email || "—"} · {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {o.countsAsNewOrderDot && (
                    <span className="rounded-full bg-rose-600/85 px-2 py-0.5 text-white" title="Counts toward sidebar until you open details">
                      New order
                    </span>
                  )}
                  {o.hasRecentVendorMessage && (
                    <span className="rounded-full bg-cyan-500/25 px-2 py-0.5 text-cyan-100" title="Vendor message in the last 7 days — counts toward sidebar">
                      Vendor message (7d)
                    </span>
                  )}
                  {o.messagesCount > 0 && !o.hasRecentVendorMessage && (
                    <span className="rounded-full bg-slate-500/25 px-2 py-0.5 text-slate-300">
                      {o.messagesCount} older message{o.messagesCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {o.issuesOpenCount > 0 && (
                    <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-amber-100" title="Open reported issues — counts toward sidebar">
                      {o.issuesOpenCount} open issue{o.issuesOpenCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => toggleExpand(o._id)} className="rounded-lg border border-white/25 bg-white/5 px-2 py-1 text-xs font-semibold text-slate-100">
                  {expanded ? "Hide details" : "View messages & details"}
                </button>
                <select
                  value={o.status}
                  onChange={async (e) => {
                    await AdminAPI.updateOrderStatus(o._id, e.target.value);
                    await load();
                  }}
                  className="h-8 rounded-lg border border-white/20 bg-white/5 px-2 text-xs text-slate-100"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" onClick={async () => { await AdminAPI.cancelOrder(o._id); await load(); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
                  Cancel override
                </button>
                <button type="button" onClick={async () => { await AdminAPI.updateReturn(o._id, "approved"); await load(); }} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">
                  Approve return
                </button>
              </div>
            </div>

            {expanded && (
              <div className="mt-3 border-t border-white/10 pt-3">
                {detailLoading && <p className="text-sm text-slate-400">Loading…</p>}
                {detailError && !detailLoading && (
                  <p className="text-sm text-red-400">{detailError}</p>
                )}
                {!detailLoading && !detailError && detail && String(detail._id) === oid && (
                  <div className="space-y-4 text-sm">
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order summary</div>
                      <dl className="mt-2 grid gap-1 text-xs text-slate-300 md:grid-cols-2">
                        <div><span className="text-slate-500">Total</span> · <span className="text-white">{money(detail.totalCents, detail.currency)}</span></div>
                        {detail.couponCode ? (
                          <div><span className="text-slate-500">Coupon</span> · <span className="text-white">{detail.couponCode}</span> (−{money(detail.discountCents || 0, detail.currency)})</div>
                        ) : null}
                        <div><span className="text-slate-500">Customer</span> · <span className="text-white">{detail.customer?.email || "—"}</span></div>
                        {detail.shipping?.fullName || detail.shipping?.line1 ? (
                          <div className="md:col-span-2">
                            <span className="text-slate-500">Ship to</span> ·{" "}
                            <span className="text-white">
                              {[detail.shipping?.fullName, detail.shipping?.line1, detail.shipping?.line2, detail.shipping?.city, detail.shipping?.state, detail.shipping?.postcode, detail.shipping?.country]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        ) : null}
                      </dl>
                      {Array.isArray(detail.items) && detail.items.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
                          {detail.items.map((it) => (
                            <li key={it._id || `${it.title}-${it.quantity}`} className="flex flex-wrap justify-between gap-2 text-xs text-slate-200">
                              <span>{it.title} × {it.quantity}</span>
                              <span className="text-slate-400">{money((it.priceCents || 0) * (it.quantity || 1), it.currency || detail.currency)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order messages (customer / vendor / platform)</div>
                      {Array.isArray(detail.messages) && detail.messages.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {detail.messages.map((m) => (
                            <li key={m._id || `${m.sentAt}-${m.text?.slice(0, 20)}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                              <div className="text-xs text-slate-400">
                                <span className="font-semibold text-slate-200">{roleLabel(m.fromRole)}</span>
                                {m.fromUser?.email ? ` · ${m.fromUser.email}` : ""}
                                {m.sentAt ? ` · ${new Date(m.sentAt).toLocaleString()}` : ""}
                              </div>
                              <p className="mt-1 text-slate-200 whitespace-pre-wrap">{m.text}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-slate-500">No messages on this order yet.</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/[0.06] p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Platform message</div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Adds to this order thread and notifies the customer and involved vendors by email.
                      </p>
                      {platformErr ? <p className="mt-2 text-xs text-red-400">{platformErr}</p> : null}
                      <textarea
                        value={platformDraft}
                        onChange={(e) => setPlatformDraft(e.target.value)}
                        rows={3}
                        placeholder="e.g. Shipping delay, refund update, or clarification for everyone on this order…"
                        className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        disabled={platformBusy || !platformDraft.trim()}
                        onClick={sendPlatformMessage}
                        className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {platformBusy ? "Sending…" : "Send platform message"}
                      </button>
                    </div>

                    {Array.isArray(detail.issues) && detail.issues.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reported issues</div>
                        <ul className="mt-2 space-y-2">
                          {detail.issues.map((issue) => (
                            <li key={issue._id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-slate-300">
                              <span className="font-semibold text-amber-200">{issue.status}</span>
                              {issue.createdAt ? ` · ${new Date(issue.createdAt).toLocaleString()}` : ""}
                              <p className="mt-1 text-slate-200">{issue.description}</p>
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
        {items.length === 0 && <p className="text-sm text-slate-400">No orders found.</p>}
      </div>
    </div>
  );
}
