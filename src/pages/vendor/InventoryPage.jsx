import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBoxOpen, FaSyncAlt, FaEdit, FaCheck } from "react-icons/fa";
import { ListingsAPI } from "../../lib/api";

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format((Number(cents) || 0) / 100);

const badgeClass = (status) => {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";
  switch (status) {
    case "active":
      return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    case "out_of_stock":
      return `${base} bg-amber-50 text-amber-800 ring-amber-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
  }
};

export default function InventoryPage() {
  const [q, setQ] = useState("");
  const [threshold, setThreshold] = useState(5);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const [activeItems, setActiveItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);

  const [savingId, setSavingId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setErr("");
    try {
      const [a, o] = await Promise.all([
        ListingsAPI.list(q, "active", 1),
        ListingsAPI.list(q, "out_of_stock", 1),
      ]);

      const aPayload = a?.data?.data ?? a?.data ?? {};
      const oPayload = o?.data?.data ?? o?.data ?? {};

      setActiveItems(Array.isArray(aPayload.items) ? aPayload.items : []);
      setOutOfStockItems(Array.isArray(oPayload.items) ? oPayload.items : []);
    } catch (e) {
      setErr(e.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refresh(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const lowStock = useMemo(() => {
    const t = Math.max(0, Number(threshold) || 0);
    return activeItems
      .filter((it) => (Number(it?.inventory?.stockQty) || 0) <= t)
      .sort((a, b) => (Number(a?.inventory?.stockQty) || 0) - (Number(b?.inventory?.stockQty) || 0));
  }, [activeItems, threshold]);

  const [draftQtyById, setDraftQtyById] = useState({});

  const updateStock = async (id, nextQty) => {
    const qty = Math.max(0, Math.floor(Number(nextQty)) || 0);
    const nextStatus = qty > 0 ? "active" : "out_of_stock";

    setSavingId(id);
    try {
      await ListingsAPI.update(id, {
        inventory: { stockQty: qty, status: nextStatus },
      });
      setToast("Stock updated");
      setDraftQtyById((prev) => ({ ...prev, [id]: "" }));
      await refresh();
    } catch (e) {
      setErr(e.message || "Failed to update stock");
    } finally {
      setSavingId(null);
      setTimeout(() => setToast(""), 1800);
    }
  };

  const activeCount = activeItems.length;
  const lowCount = lowStock.length;
  const outCount = outOfStockItems.length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Inventory & availability</h1>
            <p className="mt-1 text-sm text-gray-600">
              Low stock alerts, quick updates, and availability control.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            disabled={loading}
          >
            <FaSyncAlt className="text-sm" />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active shown</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{activeCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Low stock (≤ {threshold})</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{lowCount}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Out of stock shown</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{outCount}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search inventory by product name…"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 whitespace-nowrap">Low stock threshold</div>
          <input
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <FaBoxOpen className="text-indigo-600" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Low stock alerts</h2>
                <p className="text-xs text-gray-500">Active listings at or below your threshold</p>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <div className="p-7 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <FaCheck />
              </div>
              <p className="text-sm font-semibold text-gray-900">All good</p>
              <p className="mt-1 text-sm text-gray-500">No active items are currently low on stock.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {lowStock.slice(0, 12).map((it) => {
                const thumb =
                  it?.images?.find?.((i) => i?.isPrimary)?.url ||
                  (it?.images || [])[0]?.url ||
                  "";
                const current = Number(it?.inventory?.stockQty) || 0;
                const id = it?._id;
                const inputVal = draftQtyById[id] ?? "";
                return (
                  <div key={id} className="grid gap-3 px-5 py-4 sm:grid-cols-12 sm:items-center">
                    <div className="sm:col-span-5 flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                        {thumb ? (
                          <img src={thumb} alt={it?.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-gray-300 text-xs">—</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{it?.title || "Untitled"}</div>
                        <div className="text-xs text-gray-500">{money(it?.pricing?.priceCents, it?.pricing?.currency || "AUD")}</div>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500">Stock</div>
                      <div className="text-sm font-semibold text-gray-900">{current}</div>
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={inputVal}
                        onChange={(e) => setDraftQtyById((prev) => ({ ...prev, [id]: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Set qty"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                      <Link
                        to={`/vendor/listings/${id}/edit`}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <FaEdit />
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={savingId === id || inputVal === ""}
                        onClick={() => updateStock(id, inputVal)}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                      >
                        {savingId === id ? "Updating…" : "Update"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Out of stock</h2>
              <p className="text-xs text-gray-500">Bring items back to active availability</p>
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : outOfStockItems.length === 0 ? (
            <div className="p-7 text-center">
              <p className="text-sm font-semibold text-gray-900">Nothing is out of stock</p>
              <p className="mt-1 text-sm text-gray-500">All listed items have stock available.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {outOfStockItems.slice(0, 12).map((it) => {
                const thumb =
                  it?.images?.find?.((i) => i?.isPrimary)?.url ||
                  (it?.images || [])[0]?.url ||
                  "";
                const id = it?._id;
                const current = Number(it?.inventory?.stockQty) || 0;
                const inputVal = draftQtyById[id] ?? "";
                return (
                  <div key={id} className="grid gap-3 px-5 py-4 sm:grid-cols-12 sm:items-center">
                    <div className="sm:col-span-6 flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
                        {thumb ? (
                          <img src={thumb} alt={it?.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-gray-300 text-xs">—</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{it?.title || "Untitled"}</div>
                        <div className="text-xs text-gray-500">{money(it?.pricing?.priceCents, it?.pricing?.currency || "AUD")}</div>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500">Status</div>
                      <div className={badgeClass(it?.inventory?.status || "out_of_stock")}>
                        {String(it?.inventory?.status || "out_of_stock").replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500">Current stock</div>
                      <div className="text-sm font-semibold text-gray-900">{current}</div>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                      <input
                        type="number"
                        min="0"
                        value={inputVal}
                        onChange={(e) => setDraftQtyById((prev) => ({ ...prev, [id]: e.target.value }))}
                        className="w-24 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Qty"
                      />
                      <button
                        type="button"
                        disabled={savingId === id || inputVal === ""}
                        onClick={() => updateStock(id, inputVal)}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {savingId === id ? "Updating…" : "Re-stock"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 text-sm text-indigo-900">
        <strong>Tip:</strong> Updating stock here also updates availability status automatically:
        set quantity to a number above 0 to return the item to <strong>Active</strong>.
      </div>
    </div>
  );
}
