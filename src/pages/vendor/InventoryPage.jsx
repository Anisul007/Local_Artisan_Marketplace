import { useEffect, useState } from "react";
import { FaSyncAlt } from "react-icons/fa";
import { ListingsAPI } from "../../lib/api";
import VendorStockPanel from "../../components/vendor/VendorStockPanel";

export default function InventoryPage() {
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(false);
  const [activeItems, setActiveItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [a, o] = await Promise.all([
        ListingsAPI.list("", "active", 1, 100),
        ListingsAPI.list("", "out_of_stock", 1, 100),
      ]);
      const aPayload = a?.data?.data ?? a?.data ?? {};
      const oPayload = o?.data?.data ?? o?.data ?? {};
      setActiveItems(Array.isArray(aPayload.items) ? aPayload.items : []);
      setOutOfStockItems(Array.isArray(oPayload.items) ? oPayload.items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const onRefresh = () => refresh();
    window.addEventListener("marketplace-order-placed", onRefresh);
    window.addEventListener("vendor-orders-changed", onRefresh);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("marketplace-order-placed", onRefresh);
      window.removeEventListener("vendor-orders-changed", onRefresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory & availability</h1>
          <p className="mt-1 text-sm text-gray-600">Manage stock levels and availability for your shop.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600">
            Low stock threshold
            <input
              type="number"
              min="0"
              max="50"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 block w-20 rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <VendorStockPanel
        activeItems={activeItems}
        outOfStockItems={outOfStockItems}
        lowThreshold={threshold}
        loading={loading}
        onReload={refresh}
      />
    </div>
  );
}
