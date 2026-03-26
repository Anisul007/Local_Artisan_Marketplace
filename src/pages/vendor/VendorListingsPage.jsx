import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaPencilAlt, FaEye, FaTrashAlt, FaPlus, FaBoxOpen } from "react-icons/fa";
import { ListingsAPI } from "../../lib/api";

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format((Number(cents) || 0) / 100);

const badgeClass = (status) => {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
  switch (status) {
    case "active":
      return `${base} bg-emerald-100 text-emerald-800`;
    case "out_of_stock":
      return `${base} bg-amber-100 text-amber-800`;
    case "unavailable":
      return `${base} bg-gray-100 text-gray-700`;
    case "archived":
      return `${base} bg-rose-100 text-rose-800`;
    default:
      return `${base} bg-indigo-100 text-indigo-800`;
  }
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "unavailable", label: "Unavailable" },
  { value: "archived", label: "Archived" },
];

const StatusDropdown = ({ value, onChange, id }) => (
  <select
    value={value || "draft"}
    onChange={(e) => onChange(id, e.target.value)}
    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
    title="Change status"
  >
    {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
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

  useEffect(() => {
    const flash = location.state?.flash;
    if (flash?.message) {
      setToast(flash.message);
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
    }
    setTimeout(() => setToast(""), 1800);
  };

  const remove = async (id, title) => {
    if (!window.confirm(`Archive “${title}”? It will be hidden from customers.`)) return;
    try {
      await ListingsAPI.remove(id);
      setToast("Listing archived");
      fetchData();
    } catch (e) {
      setErr(e.message || "Failed to delete");
    }
    setTimeout(() => setToast(""), 1800);
  };

  const hasItems = useMemo(() => items && items.length > 0, [items]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage products, availability, and visibility.</p>
        </div>
        <Link
          to="/vendor/listings/new"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <FaPlus className="text-sm" />
          Add product
        </Link>
      </div>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by product name…"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition
                ${status === opt.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden border-b border-gray-200 bg-gray-50/80 px-4 py-3 md:grid md:grid-cols-12 md:gap-4">
          <div className="md:col-span-5 text-xs font-semibold uppercase tracking-wider text-gray-500">Product</div>
          <div className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</div>
          <div className="md:col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Price</div>
          <div className="md:col-span-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</div>
        </div>

        {loading && firstLoad ? (
          <div className="space-y-0 border-t border-gray-200">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 md:grid md:grid-cols-12 md:gap-4">
                <div className="md:col-span-5 flex items-center gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
                <div className="md:col-span-2"><div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse" /></div>
                <div className="md:col-span-2"><div className="h-4 w-12 rounded bg-gray-100 animate-pulse" /></div>
                <div className="md:col-span-3" />
              </div>
            ))}
          </div>
        ) : hasItems ? (
          <div className="divide-y divide-gray-100">
            {items.map((it, idx) => {
              const thumb =
                (it.images || []).find((i) => i?.isPrimary)?.url ||
                (it.images || [])[0]?.url ||
                null;
              const statusVal = it?.inventory?.status || "draft";
              return (
                <div
                  key={it._id || idx}
                  className="grid items-center gap-4 px-4 py-4 md:grid-cols-12 md:gap-4 hover:bg-gray-50/50"
                >
                  <div className="md:col-span-5 flex min-w-0 items-center gap-4">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                      {thumb ? (
                        <img src={thumb} alt={it.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <FaBoxOpen className="text-xl" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900">{it.title || "Untitled"}</div>
                      <div className="text-xs text-gray-500">
                        Updated {it.updatedAt ? new Date(it.updatedAt).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                    <span className={badgeClass(statusVal)}>{statusVal.replace(/_/g, " ")}</span>
                    <StatusDropdown value={statusVal} onChange={changeStatus} id={it._id} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-medium text-gray-900">
                      {money(it?.pricing?.priceCents, it?.pricing?.currency || "AUD")}
                    </div>
                    {it?.pricing?.compareAtCents ? (
                      <div className="text-xs text-gray-500 line-through">
                        {money(it.pricing.compareAtCents, it?.pricing?.currency || "AUD")}
                      </div>
                    ) : null}
                  </div>
                  <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-2">
                    <Link
                      to={`/vendor/listings/${it._id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Edit"
                    >
                      <FaPencilAlt />
                      Edit
                    </Link>
                    <Link
                      to={`/vendor/listings/${it._id}/preview`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      title="Preview"
                    >
                      <FaEye />
                      Preview
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(it._id, it.title)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                      title="Archive"
                    >
                      <FaTrashAlt />
                      Archive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <FaBoxOpen className="text-3xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No listings yet</h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Add your first product to start selling. You can save as draft and publish when ready.
            </p>
            <Link
              to="/vendor/listings/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <FaPlus />
              Add your first product
            </Link>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => fetchData({ page: Math.max(1, page - 1) })}
            disabled={page <= 1}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{pages}</span>
          </span>
          <button
            type="button"
            onClick={() => fetchData({ page: Math.min(pages, page + 1) })}
            disabled={page >= pages}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
