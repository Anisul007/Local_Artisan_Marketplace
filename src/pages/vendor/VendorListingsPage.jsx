import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ListingsAPI } from "../../lib/api";

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format((Number(cents) || 0) / 100);

const badgeClass = (status) => {
  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset";
  switch (status) {
    case "active":
      return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    case "out_of_stock":
      return `${base} bg-amber-50 text-amber-700 ring-amber-200`;
    case "unavailable":
      return `${base} bg-gray-100 text-gray-700 ring-gray-300`;
    case "archived":
      return `${base} bg-rose-50 text-rose-700 ring-rose-200`;
    default:
      return `${base} bg-indigo-50 text-indigo-700 ring-indigo-200`; // draft
  }
};

const StatusDropdown = ({ value, onChange }) => (
  <select
    value={value || "draft"}
    onChange={(e) => onChange(e.target.value)}
    className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
    title="Change status"
  >
    <option value="active">Active</option>
    <option value="draft">Draft</option>
    <option value="out_of_stock">Out of stock</option>
    <option value="unavailable">Unavailable</option>
    <option value="archived">Archived</option>
  </select>
);

export default function VendorListingsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const latestFetch = useRef(0);

  const location = useLocation();
  const nav = useNavigate();

  // Pick up flash messages (e.g., after Publish)
  useEffect(() => {
    const flash = location.state?.flash;
    if (flash?.message) {
      setToast(flash.message);
      // clear flash from history so it doesn't re-show on refresh
      nav(".", { replace: true, state: null });
      const t = setTimeout(() => setToast(""), 2200);
      return () => clearTimeout(t);
    }
  }, [location.state, nav]);

  const fetchData = async (opts = {}) => {
    const p = opts.page ?? page;
    const s = opts.status ?? status;
    const query = opts.q ?? q;

    setLoading(true);
    setErr("");
    const thisCall = Date.now();
    latestFetch.current = thisCall;

    try {
      const res = await ListingsAPI.list(query, s, p);
      // Accept both shapes:
      const payload = res?.data?.data ?? res?.data ?? {};
      const list = payload.items ?? [];
      const pg =
        payload.pagination?.pages ??
        (payload.total && payload.limit ? Math.max(1, Math.ceil(payload.total / payload.limit)) : 1);

      if (latestFetch.current === thisCall) {
        setItems(Array.isArray(list) ? list : []);
        setPages(pg || 1);
        setPage(p);
        setFirstLoad(false);
      }
    } catch (e) {
      if (latestFetch.current === thisCall) {
        setErr(e.message || "Failed to load");
        setFirstLoad(false);
      }
    } finally {
      if (latestFetch.current === thisCall) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search + status filter
  useEffect(() => {
    const t = setTimeout(() => fetchData({ page: 1 }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const changeStatus = async (id, next) => {
    try {
      await ListingsAPI.setStatus(id, next);
      setToast("Status updated");
      fetchData();
    } catch (e) {
      setErr(e.message || "Failed to update status");
    } finally {
      setTimeout(() => setToast(""), 1800);
    }
  };

  const remove = async (id, title) => {
    const ok = window.confirm(`Delete “${title}”? This moves it to archived and hides it from customers.`);
    if (!ok) return;
    try {
      await ListingsAPI.remove(id);
      setToast("Listing deleted");
      fetchData();
    } catch (e) {
      setErr(e.message || "Failed to delete");
    } finally {
      setTimeout(() => setToast(""), 1800);
    }
  };

  const hasItems = useMemo(() => items && items.length > 0, [items]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My Listings</h1>
          <p className="text-sm text-gray-500">Manage your products, availability, and details.</p>
        </div>
        <Link
          to="/vendor/listings/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Listing
        </Link>
      </div>

      {/* Controls */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-7">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title…"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="unavailable">Unavailable</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <button
            onClick={() => fetchData({ page: 1 })}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 shadow-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {toast && (
        <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-200">{toast}</div>
      )}
      {err && <div className="mb-3 rounded-lg bg-rose-50 p-3 text-rose-700 ring-1 ring-rose-200">{err}</div>}

      {/* Table/Card list */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
        <div className="hidden bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 md:grid md:grid-cols-12">
          <div className="md:col-span-6">Product</div>
          <div className="md:col-span-2">Status</div>
          <div className="md:col-span-2">Price</div>
          <div className="md:col-span-2 text-right">Actions</div>
        </div>

        {loading && firstLoad ? (
          <div className="p-8 grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : hasItems ? (
          items.map((it, idx) => {
            const thumb =
              (it.images || []).find((i) => i?.isPrimary)?.url ||
              (it.images || [])[0]?.url ||
              "https://via.placeholder.com/80x80?text=%20";

            return (
              <div key={it._id || idx} className="grid items-center gap-4 border-t border-gray-200 px-4 py-4 md:grid-cols-12">
                {/* Product */}
                <div className="md:col-span-6 flex items-center gap-4">
                  <img src={thumb} alt={it.title} className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-gray-200" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.title || "Untitled"}</div>
                    <div className="text-xs text-gray-500">
                      Updated {it.updatedAt ? new Date(it.updatedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="md:col-span-2 space-y-2">
                  <span className={badgeClass(it?.inventory?.status)}>{it?.inventory?.status || "draft"}</span>
                  <StatusDropdown value={it?.inventory?.status} onChange={(next) => changeStatus(it._id, next)} />
                </div>

                {/* Price */}
                <div className="md:col-span-2">
                  <div className="font-medium">
                    {money(it?.pricing?.priceCents, it?.pricing?.currency || "AUD")}
                  </div>
                  {it?.pricing?.compareAtCents ? (
                    <div className="text-xs text-gray-500 line-through">
                      {money(it.pricing.compareAtCents, it?.pricing?.currency || "AUD")}
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <Link
                    to={`/vendor/listings/${it._id}/edit`}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                    title="Edit"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/vendor/listings/${it._id}/preview`}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                    title="Preview"
                  >
                    Preview
                  </Link>
                  <button
                    onClick={() => remove(it._id, it.title)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-gray-100 p-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-gray-500">
                <path
                  d="M3 7h18M7 7l1.5-3h7L17 7M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-gray-600">No products yet. Start by adding your first listing.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => fetchData({ page: Math.max(1, page - 1) })}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
          >
            ← Prev
          </button>
          <div className="text-sm text-gray-600">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{pages}</span>
          </div>
          <button
            onClick={() => fetchData({ page: Math.min(pages, page + 1) })}
            disabled={page >= pages}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}




