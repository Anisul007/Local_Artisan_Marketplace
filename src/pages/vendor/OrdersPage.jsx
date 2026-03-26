import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "../../lib/api";

export default function OrdersPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalUnits: 0,
    revenueCents: 0,
    statusBreakdown: { processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState(null);

  const money = (cents, currency = "AUD") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format((Number(cents) || 0) / 100);

  const load = async ({ status = "", query = "", pageNum = 1 } = {}) => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "20");
      qs.set("page", String(pageNum));
      if (status) qs.set("status", status);
      if (query) qs.set("q", query);
      const r = await apiGet(`/api/vendor/orders?${qs.toString()}`);
      if (r?.ok) {
        setItems(Array.isArray(r?.data?.items) ? r.data.items : []);
        setPagination(r?.data?.pagination || { page: pageNum, pages: 1, total: 0, limit: 20 });
        setSummary(
          r?.data?.summary || {
            totalOrders: 0,
            totalUnits: 0,
            revenueCents: 0,
            statusBreakdown: { processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
          }
        );
      } else {
        setErr(r?.data?.message || "Could not load vendor orders");
      }
    } catch (e) {
      setErr(e?.message || "Could not load vendor orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ status: statusFilter, query: q, pageNum: page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, q, page]);

  async function updateStatus(orderId, status) {
    if (!orderId || !status) return;
    setSavingId(orderId);
    setErr("");
    try {
      const r = await apiPatch(`/api/vendor/orders/${orderId}/status`, { status });
      if (!r?.ok) throw new Error(r?.data?.message || "Could not update status");
      await load({ status: statusFilter, query: q, pageNum: page });
    } catch (e) {
      setErr(e?.message || "Could not update status");
    } finally {
      setSavingId(null);
    }
  }

  const statusPill = useMemo(
    () => ({
      processing: "bg-amber-100 text-amber-800",
      shipped: "bg-blue-100 text-blue-800",
      delivered: "bg-emerald-100 text-emerald-800",
      cancelled: "bg-gray-100 text-gray-700",
    }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-gray-900">Orders</h1>
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="mt-3">
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search by order code, customer, email, item..."
            className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total orders" value={summary.totalOrders} />
          <Stat label="Units sold" value={summary.totalUnits} />
          <Stat label="Vendor revenue" value={money(summary.revenueCents)} />
          <Stat
            label="Processing now"
            value={summary?.statusBreakdown?.processing ?? 0}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ) : err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-600">No orders yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((o) => {
              const isOpen = !!expanded[o._id];
              return (
                <div key={o._id} className="rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [o._id]: !p[o._id] }))}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{o.code || o._id}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Placed {o.placedAt ? new Date(o.placedAt).toLocaleString() : "—"}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">{o.customer?.name || "Customer"}</span>
                        {o.customer?.email ? ` · ${o.customer.email}` : ""}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {money(o.vendorTotalCents, o.currency)}
                      </div>
                      <div className="text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPill[o.status] || "bg-gray-100 text-gray-700"}`}>
                          {o.status || "—"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">{o.vendorItemCount || 0} units</div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-200 p-4">
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <h3 className="text-sm font-semibold text-gray-900">Items in this order</h3>
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

                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Customer + shipping</h3>
                          <div className="mt-2 rounded-lg border border-gray-200 p-3 text-sm">
                            <div className="font-medium text-gray-900">{o.shipping?.fullName || o.customer?.name || "—"}</div>
                            {o.customer?.email && <div className="mt-1 text-gray-600">{o.customer.email}</div>}
                            {o.shipping?.phone && <div className="mt-1 text-gray-600">{o.shipping.phone}</div>}
                            <div className="mt-2 text-gray-700">
                              {[o.shipping?.line1, o.shipping?.line2, o.shipping?.city, o.shipping?.state, o.shipping?.postcode, o.shipping?.country]
                                .filter(Boolean)
                                .join(", ") || "No shipping details"}
                            </div>
                            {o.estimatedDelivery && (
                              <div className="mt-2 text-xs text-gray-500">
                                Est. delivery {new Date(o.estimatedDelivery).toLocaleDateString()}
                              </div>
                            )}
                            {o.couponCode && (
                              <div className="mt-2 text-xs font-semibold text-indigo-700">
                                Coupon used: {o.couponCode}
                              </div>
                            )}
                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Update order status
                              </label>
                              <div className="flex items-center gap-2">
                                <select
                                  defaultValue={o.status || "processing"}
                                  className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                                  onChange={(e) => updateStatus(o._id, e.target.value)}
                                  disabled={savingId === o._id}
                                >
                                  <option value="processing">Processing</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                                {savingId === o._id && (
                                  <span className="text-xs text-gray-500">Saving...</span>
                                )}
                              </div>
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
        {!loading && !err && pagination.pages > 1 && (
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
