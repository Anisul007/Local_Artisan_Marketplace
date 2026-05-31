import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaBoxOpen, FaCheck, FaCubes, FaEdit, FaSyncAlt } from "react-icons/fa";
import { ListingsAPI } from "../../lib/api";

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format((Number(cents) || 0) / 100);

function badgeClass(status) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";
  switch (status) {
    case "active":
      return `${base} bg-emerald-50 text-emerald-700 ring-emerald-200`;
    case "out_of_stock":
      return `${base} bg-amber-50 text-amber-800 ring-amber-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 ring-gray-200`;
  }
}

function StockRow({ item, inputVal, onInputChange, onSave, saving, showStatus = false }) {
  const thumb = item?.images?.find?.((i) => i?.isPrimary)?.url || (item?.images || [])[0]?.url || "";
  const id = item?._id;
  const current = Number(item?.inventory?.stockQty) || 0;
  const status = item?.inventory?.status || "draft";
  const isLow = current <= 5 && status === "active";

  return (
    <div className="grid gap-3 px-4 py-3.5 sm:grid-cols-12 sm:items-center sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-3 sm:col-span-5">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-gray-300">
              <FaBoxOpen />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-gray-900">{item?.title || "Untitled"}</div>
          <div className="text-xs text-gray-500">{money(item?.pricing?.priceCents, item?.pricing?.currency || "AUD")}</div>
        </div>
      </div>
      <div className="sm:col-span-2">
        <div className="text-xs text-gray-500">Current</div>
        <div className={`text-sm font-bold tabular-nums ${isLow ? "text-amber-700" : "text-gray-900"}`}>{current}</div>
      </div>
      {showStatus ? (
        <div className="sm:col-span-2">
          <div className={badgeClass(status)}>{String(status).replace(/_/g, " ")}</div>
        </div>
      ) : null}
      <div className={`flex flex-wrap items-center gap-2 ${showStatus ? "sm:col-span-3 sm:justify-end" : "sm:col-span-5 sm:justify-end"}`}>
        <input
          type="number"
          min="0"
          value={inputVal}
          onChange={(e) => onInputChange(id, e.target.value)}
          className="w-24 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          placeholder="New qty"
          aria-label={`New stock for ${item?.title || "product"}`}
        />
        <Link
          to={`/vendor/listings/${id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <FaEdit /> Edit
        </Link>
        <button
          type="button"
          disabled={saving || inputVal === ""}
          onClick={() => onSave(id, inputVal)}
          className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Update stock"}
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { id: "all", label: "All in stock view" },
  { id: "low", label: "Low stock" },
  { id: "out", label: "Out of stock" },
];

export default function VendorStockPanel({
  activeItems = [],
  outOfStockItems = [],
  lowThreshold = 5,
  loading = false,
  onReload,
  compact = false,
}) {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [draftQtyById, setDraftQtyById] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  const sellableItems = useMemo(() => {
    const map = new Map();
    for (const it of [...activeItems, ...outOfStockItems]) {
      if (it?._id) map.set(String(it._id), it);
    }
    return [...map.values()].sort((a, b) => (a?.title || "").localeCompare(b?.title || ""));
  }, [activeItems, outOfStockItems]);

  const threshold = Math.max(0, Number(lowThreshold) || 0);

  const lowStock = useMemo(
    () =>
      activeItems
        .filter((it) => (Number(it?.inventory?.stockQty) || 0) <= threshold)
        .sort((a, b) => (Number(a?.inventory?.stockQty) || 0) - (Number(b?.inventory?.stockQty) || 0)),
    [activeItems, threshold]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = sellableItems;
    if (tab === "low") list = lowStock;
    if (tab === "out") list = outOfStockItems;
    if (!needle) return list;
    return list.filter((it) => String(it?.title || "").toLowerCase().includes(needle));
  }, [q, tab, sellableItems, lowStock, outOfStockItems]);

  async function updateStock(id, nextQty) {
    const qty = Math.max(0, Math.floor(Number(nextQty)) || 0);
    const nextStatus = qty > 0 ? "active" : "out_of_stock";
    setSavingId(id);
    setErr("");
    try {
      const r = await ListingsAPI.update(id, {
        inventory: { stockQty: qty, status: nextStatus },
      });
      if (r?.ok === false) throw new Error(r?.data?.message || "Update failed");
      setToast("Stock updated");
      setDraftQtyById((prev) => ({ ...prev, [id]: "" }));
      if (typeof onReload === "function") await onReload();
    } catch (e) {
      setErr(e?.message || "Failed to update stock");
    } finally {
      setSavingId(null);
      setTimeout(() => setToast(""), 2200);
    }
  }

  return (
    <section id="stock-management" className="rounded-2xl border border-indigo-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <FaCubes className="text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage stock</h2>
            <p className="mt-0.5 text-sm text-gray-600">
              Update quantities for active and out-of-stock listings. Orders automatically reduce stock when placed.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!compact && (
            <Link
              to="/vendor/inventory"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Full inventory page
            </Link>
          )}
          <button
            type="button"
            onClick={() => onReload?.()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Active listings</div>
          <div className="text-xl font-bold text-gray-900">{activeItems.length}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Low (≤ {threshold})</div>
          <div className="text-xl font-bold text-amber-900">{lowStock.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Out of stock</div>
          <div className="text-xl font-bold text-gray-900">{outOfStockItems.length}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
              {t.id === "low" && lowStock.length > 0 ? ` (${lowStock.length})` : ""}
              {t.id === "out" && outOfStockItems.length > 0 ? ` (${outOfStockItems.length})` : ""}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full max-w-xs rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {toast && <div className="mx-5 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{toast}</div>}
      {err && <div className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {loading ? (
        <div className="space-y-3 p-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <FaCheck />
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {tab === "low" ? "No low-stock items" : tab === "out" ? "Nothing out of stock" : "No products to show"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {tab === "all" ? "Publish active listings to manage stock here." : "You're all caught up."}
          </p>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-gray-100">
          {filtered.map((it) => (
            <StockRow
              key={it._id}
              item={it}
              inputVal={draftQtyById[it._id] ?? ""}
              onInputChange={(id, val) => setDraftQtyById((prev) => ({ ...prev, [id]: val }))}
              onSave={updateStock}
              saving={savingId === it._id}
              showStatus={tab === "all"}
            />
          ))}
        </div>
      )}

      <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
        Setting quantity to <strong>0</strong> marks a product as out of stock. Any value above <strong>0</strong> sets it back to active.
      </p>
    </section>
  );
}
