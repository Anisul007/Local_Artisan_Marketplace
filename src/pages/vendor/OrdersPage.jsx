import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API, VendorOrdersAPI } from "../../lib/api";

const STATUS_LABEL = {
  new: "New",
  accepted: "Accepted",
  rejected: "Rejected",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_PILL = {
  new: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  accepted: "bg-blue-100 text-blue-800 ring-blue-200",
  rejected: "bg-rose-100 text-rose-800 ring-rose-200",
  in_progress: "bg-amber-100 text-amber-800 ring-amber-200",
  completed: "bg-violet-100 text-violet-800 ring-violet-200",
  cancelled: "bg-gray-100 text-gray-700 ring-gray-200",
};

const STATUS_OPTIONS = ["new", "accepted", "in_progress", "completed", "rejected", "cancelled"];

function sortOrderMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return [...messages].sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
}

function messageRoleLabel(fromRole) {
  if (fromRole === "vendor") return "You (vendor)";
  if (fromRole === "customer") return "Customer";
  if (fromRole === "system") return "Platform";
  return fromRole || "Message";
}

function bumpVendorNotify() {
  window.dispatchEvent(new Event("vendor-orders-changed"));
  window.dispatchEvent(new Event("vendor-notifications-changed"));
}

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalUnits: 0,
    revenueCents: 0,
    completedOrders: 0,
    statusBreakdown: {
      new: 0,
      accepted: 0,
      rejected: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    },
  });
  const [analytics, setAnalytics] = useState({ totalRevenueCents: 0, completedOrders: 0, estimatedProfitCents: 0, monthlySales: [], bestSellers: [] });
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [issueDrafts, setIssueDrafts] = useState({});

  const money = (cents, currency = "AUD") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format((Number(cents) || 0) / 100);

  const load = async ({ status = "", query = "", pageNum = 1, sort = "date" } = {}) => {
    setLoading(true);
    setErr("");
    try {
      const r = await VendorOrdersAPI.list({
        limit: 20,
        page: pageNum,
        status,
        q: query,
        sortBy: sort,
        sortDir: "desc",
      });
      if (!r?.ok) {
        setErr(r?.data?.message || "Could not load vendor orders");
      } else {
        setItems(Array.isArray(r?.data?.items) ? r.data.items : []);
        setPagination(r?.data?.pagination || { page: pageNum, pages: 1, total: 0, limit: 20 });
        setSummary(
          r?.data?.summary || {
            totalOrders: 0,
            totalUnits: 0,
            revenueCents: 0,
            completedOrders: 0,
            statusBreakdown: { new: 0, accepted: 0, rejected: 0, in_progress: 0, completed: 0, cancelled: 0 },
          }
        );
        bumpVendorNotify();
      }
      const a = await VendorOrdersAPI.analytics();
      if (a?.ok) setAnalytics(a?.data?.data || a?.data || analytics);
    } catch (e) {
      setErr(e?.message || "Could not load vendor orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ status: statusFilter, query: q, pageNum: page, sort: sortBy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, q, page, sortBy]);

  useEffect(() => {
    const highlight = searchParams.get("order");
    if (!highlight || items.length === 0) return;
    const match = items.find((o) => String(o._id) === highlight);
    if (!match) return;
    setExpanded((prev) => ({ ...prev, [match._id]: true }));
    requestAnimationFrame(() => {
      document.getElementById(`vendor-order-${match._id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [searchParams, items]);

  async function updateStatus(orderId, status) {
    if (!orderId || !status) return;
    if (status === "rejected" && !window.confirm("Reject this order? The customer will be notified.")) return;
    setSavingId(orderId);
    setErr("");
    setOkMsg("");
    try {
      const r = await VendorOrdersAPI.updateStatus(orderId, status);
      if (!r?.ok) throw new Error(r?.data?.message || "Could not update status");
      setOkMsg(`Order updated to ${STATUS_LABEL[status] || status}. Customer has been notified.`);
      await load({ status: statusFilter, query: q, pageNum: page, sort: sortBy });
    } catch (e) {
      setErr(e?.message || "Could not update status");
    } finally {
      setSavingId(null);
    }
  }

  async function sendMessage(orderId) {
    const text = String(messageDrafts[orderId] || "").trim();
    if (!text) return;
    setSavingId(orderId);
    setErr("");
    setOkMsg("");
    try {
      const r = await VendorOrdersAPI.sendMessage(orderId, text);
      if (!r?.ok) throw new Error(r?.data?.message || "Could not send message");
      setMessageDrafts((p) => ({ ...p, [orderId]: "" }));
      setOkMsg(r?.data?.message || "Message sent.");
      await load({ status: statusFilter, query: q, pageNum: page, sort: sortBy });
    } catch (e) {
      setErr(e?.message || "Could not send message");
    } finally {
      setSavingId(null);
    }
  }

  async function reportIssue(orderId) {
    const description = String(issueDrafts[orderId] || "").trim();
    if (!description) return;
    setSavingId(orderId);
    setErr("");
    setOkMsg("");
    try {
      const r = await VendorOrdersAPI.reportIssue(orderId, description);
      if (!r?.ok) throw new Error(r?.data?.message || "Could not submit issue");
      setIssueDrafts((p) => ({ ...p, [orderId]: "" }));
      setOkMsg("Issue submitted for admin review.");
      await load({ status: statusFilter, query: q, pageNum: page, sort: sortBy });
    } catch (e) {
      setErr(e?.message || "Could not submit issue");
    } finally {
      setSavingId(null);
    }
  }

  const chartMax = useMemo(
    () => Math.max(1, ...(Array.isArray(analytics?.monthlySales) ? analytics.monthlySales.map((m) => Number(m?.revenueCents || 0)) : [0])),
    [analytics]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-gray-900">Order Management</h1>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${API}/api/vendor/reports/export?format=csv`}
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </a>
            <a
              href={`${API}/api/vendor/reports/export?format=pdf`}
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Export PDF
            </a>
          </div>
        </div>

        {okMsg && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{okMsg}</div>}
        {err && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setPage(1);
              setSortBy(e.target.value);
            }}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="date">Sort by date</option>
            <option value="status">Sort by status</option>
          </select>
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search order, customer, email, item..."
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Stat label="Total orders" value={summary.totalOrders} />
          <Stat label="New" value={summary?.statusBreakdown?.new ?? 0} />
          <Stat label="Completed" value={summary?.statusBreakdown?.completed ?? 0} />
          <Stat label="Revenue" value={money(summary.revenueCents)} />
          <Stat
            label="Est. profit"
            value={money(Math.round(Number(summary.revenueCents || 0) * 0.35))}
          />
          <Stat label="Units sold" value={summary.totalUnits} />
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Monthly Sales Trend</div>
          <div className="flex items-end gap-2">
            {(analytics?.monthlySales || []).slice(-8).map((m) => {
              const pct = (Number(m.revenueCents || 0) / chartMax) * 100;
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded bg-indigo-100">
                    <div className="w-full rounded bg-indigo-500" style={{ height: `${Math.max(8, pct)}px` }} />
                  </div>
                  <div className="text-[10px] text-gray-500">{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-600">No orders yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((o) => {
              const isOpen = !!expanded[o._id];
              const statusClass = STATUS_PILL[o.status] || "bg-gray-100 text-gray-700 ring-gray-200";
              return (
                <div
                  key={o._id}
                  id={`vendor-order-${o._id}`}
                  className={`rounded-xl border ${o.status === "new" ? "border-emerald-300 ring-2 ring-emerald-100" : "border-gray-200"}`}
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [o._id]: !p[o._id] }))}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900">{o.code || o._id}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            Customer: {o.customer?.name || "Customer"} · {o.placedAt ? new Date(o.placedAt).toLocaleDateString() : "—"}
                          </div>
                          {o.status === "new" && (
                            <p className="mt-1 text-xs font-medium text-emerald-800">Action required — accept or reject this order.</p>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-900">{money(o.vendorTotalCents, o.currency)}</div>
                        <div className="text-sm">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusClass}`}>
                            {STATUS_LABEL[o.status] || o.status || "—"}
                          </span>
                        </div>
                      </div>
                    </button>
                    {o.status === "new" && (
                      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-emerald-200/60 pt-3 sm:border-t-0 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => updateStatus(o._id, "accepted")}
                          disabled={savingId === o._id}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
                        >
                          Accept order
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(o._id, "rejected")}
                          disabled={savingId === o._id}
                          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-60"
                        >
                          Reject order
                        </button>
                      </div>
                    )}
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-200 p-4">
                      <div className="grid gap-4 xl:grid-cols-3">
                        <div className="xl:col-span-2 space-y-4">
                          <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <h3 className="text-sm font-semibold text-gray-900">Order summary</h3>
                            <dl className="mt-2 grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                              <div>
                                <dt className="font-medium text-gray-500">Order number</dt>
                                <dd className="font-mono text-gray-900">{o.code || o._id}</dd>
                              </div>
                              <div>
                                <dt className="font-medium text-gray-500">Placed</dt>
                                <dd className="text-gray-900">
                                  {o.placedAt ? new Date(o.placedAt).toLocaleString() : "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="font-medium text-gray-500">Est. delivery</dt>
                                <dd className="text-gray-900">
                                  {o.estimatedDelivery ? new Date(o.estimatedDelivery).toLocaleDateString() : "—"}
                                </dd>
                              </div>
                              <div>
                                <dt className="font-medium text-gray-500">Your items (this order)</dt>
                                <dd className="font-semibold text-gray-900">{money(o.vendorTotalCents, o.currency)}</dd>
                              </div>
                              {Number(o.totalCents) > 0 && (
                                <div>
                                  <dt className="font-medium text-gray-500">Customer order total</dt>
                                  <dd className="text-gray-900">
                                    {money(o.totalCents, o.currency)}
                                    {Number(o.totalCents) !== Number(o.vendorTotalCents) && (
                                      <span className="ml-1 text-gray-500">(includes other sellers)</span>
                                    )}
                                  </dd>
                                </div>
                              )}
                              {(o.couponCode || Number(o.discountCents) > 0) && (
                                <div className="sm:col-span-2">
                                  <dt className="font-medium text-gray-500">Coupon / discount (order)</dt>
                                  <dd className="text-gray-900">
                                    {o.couponCode ? (
                                      <span>
                                        Code <span className="font-mono">{o.couponCode}</span>
                                        {Number(o.discountCents) > 0 ? ` (−${money(o.discountCents, o.currency)})` : ""}
                                      </span>
                                    ) : (
                                      `−${money(o.discountCents, o.currency)}`
                                    )}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">Line items (your products)</h3>
                            <div className="mt-2 space-y-2">
                              {(o.items || []).map((it, idx) => (
                                <div key={`${o._id}-${it.listingId || idx}`} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-gray-900">{it.title}</div>
                                    <div className="text-xs text-gray-500">
                                      Qty {it.quantity} · {money(it.priceCents, it.currency)} each
                                    </div>
                                  </div>
                                  <div className="font-semibold text-gray-900">{money(it.lineTotalCents, it.currency)}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3">
                            <h4 className="text-sm font-semibold text-gray-900">Contact customer</h4>
                            <p className="mt-0.5 text-xs text-gray-600">
                              Clarify shipping, options, or timing. Your note is stored on this order and the customer is notified by email when possible.
                            </p>
                            <dl className="mt-3 space-y-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                              <div className="flex flex-wrap gap-x-2">
                                <dt className="font-semibold text-gray-500">Name</dt>
                                <dd className="text-gray-900">{o.shipping?.fullName || o.customer?.name || "—"}</dd>
                              </div>
                              <div className="flex flex-wrap gap-x-2">
                                <dt className="font-semibold text-gray-500">Account email</dt>
                                <dd className="min-w-0 break-all">
                                  {o.customer?.email ? (
                                    <a href={`mailto:${o.customer.email}`} className="font-medium text-indigo-700 hover:underline">
                                      {o.customer.email}
                                    </a>
                                  ) : (
                                    <span className="text-amber-800">Not on file — message is saved on the order only.</span>
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-wrap gap-x-2">
                                <dt className="font-semibold text-gray-500">Phone</dt>
                                <dd>
                                  {o.shipping?.phone ? (
                                    <a
                                      href={`tel:${String(o.shipping.phone).replace(/\s/g, "")}`}
                                      className="font-medium text-indigo-700 hover:underline"
                                    >
                                      {o.shipping.phone}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </dd>
                              </div>
                            </dl>
                            <textarea
                              value={messageDrafts[o._id] || ""}
                              onChange={(e) => setMessageDrafts((p) => ({ ...p, [o._id]: e.target.value }))}
                              rows={3}
                              placeholder="e.g. Can you confirm the engraving text, or a preferred delivery window?"
                              className="mt-3 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => sendMessage(o._id)}
                              disabled={savingId === o._id}
                              className="mt-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                            >
                              Send to customer
                            </button>
                          </div>

                          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                            <h4 className="text-sm font-semibold text-gray-900">Conversation</h4>
                            <p className="mt-0.5 text-xs text-gray-500">
                              Full thread — you, the customer, and platform notes.
                            </p>
                            {sortOrderMessages(o.messages).length === 0 ? (
                              <p className="mt-2 text-xs text-gray-500">No messages yet. Use Contact customer above to start.</p>
                            ) : (
                              <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                                {sortOrderMessages(o.messages).map((m) => (
                                  <li
                                    key={m._id || `${m.sentAt}-${String(m.text || "").slice(0, 12)}`}
                                    className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm shadow-sm"
                                  >
                                    <div className="text-xs text-gray-500">
                                      <span className="font-semibold text-gray-800">{messageRoleLabel(m.fromRole)}</span>
                                      {m.sentAt ? ` · ${new Date(m.sentAt).toLocaleString()}` : ""}
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap text-gray-800">{m.text}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="rounded-lg border border-gray-200 p-3">
                            <h4 className="text-sm font-semibold text-gray-900">Report issue to admin</h4>
                            <textarea
                              value={issueDrafts[o._id] || ""}
                              onChange={(e) => setIssueDrafts((p) => ({ ...p, [o._id]: e.target.value }))}
                              rows={3}
                              placeholder="Describe the order issue..."
                              className="mt-2 w-full rounded-lg border border-gray-300 p-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => reportIssue(o._id)}
                              disabled={savingId === o._id}
                              className="mt-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                            >
                              Submit issue
                            </button>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Customer + shipping</h3>
                          <div className="mt-2 rounded-lg border border-gray-200 p-3 text-sm">
                            <div className="font-medium text-gray-900">{o.shipping?.fullName || o.customer?.name || "—"}</div>
                            {o.customer?.email ? (
                              <div className="mt-1 break-all">
                                <a href={`mailto:${o.customer.email}`} className="text-indigo-700 hover:underline">
                                  {o.customer.email}
                                </a>
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-amber-800">No account email</div>
                            )}
                            {o.shipping?.phone ? (
                              <div className="mt-1">
                                <a
                                  href={`tel:${String(o.shipping.phone).replace(/\s/g, "")}`}
                                  className="text-indigo-700 hover:underline"
                                >
                                  {o.shipping.phone}
                                </a>
                              </div>
                            ) : null}
                            <div className="mt-2 text-gray-700">
                              {[o.shipping?.line1, o.shipping?.line2, o.shipping?.city, o.shipping?.state, o.shipping?.postcode, o.shipping?.country]
                                .filter(Boolean)
                                .join(", ") || "No shipping details"}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3 text-xs">
                              {o.customer?.id ? (
                                <Link
                                  to={`/vendor/report-abuse?targetType=customer&targetId=${o.customer.id}&targetLabel=${encodeURIComponent(o.customer?.name || "Customer")}`}
                                  className="font-semibold text-rose-700 hover:underline"
                                >
                                  Report customer abuse
                                </Link>
                              ) : null}
                              <Link
                                to={`/vendor/report-abuse?targetType=order&targetId=${o._id}&targetLabel=${encodeURIComponent(o.code || "Order")}`}
                                className="font-semibold text-rose-700 hover:underline"
                              >
                                Report order issue
                              </Link>
                            </div>
                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Decision & status</label>

                              {o.status === "new" ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(o._id, "accepted")}
                                    disabled={savingId === o._id}
                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(o._id, "rejected")}
                                    disabled={savingId === o._id}
                                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {o.status === "accepted" && (
                                    <button
                                      type="button"
                                      onClick={() => updateStatus(o._id, "in_progress")}
                                      disabled={savingId === o._id}
                                      className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
                                    >
                                      Mark In Progress
                                    </button>
                                  )}
                                  {o.status === "in_progress" && (
                                    <button
                                      type="button"
                                      onClick={() => updateStatus(o._id, "completed")}
                                      disabled={savingId === o._id}
                                      className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                                    >
                                      Mark Completed
                                    </button>
                                  )}
                                  {(o.status === "accepted" || o.status === "in_progress") && (
                                    <button
                                      type="button"
                                      onClick={() => updateStatus(o._id, "cancelled")}
                                      disabled={savingId === o._id}
                                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} orders
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}
