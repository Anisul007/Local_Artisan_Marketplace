import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";
import { Link } from "react-router-dom";

export default function OrdersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await apiGet("/api/vendor/orders?limit=50");
      setItems(r?.data?.items || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-extrabold text-gray-900">Orders</h1>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-600">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o._id} className="border-t">
                    <td className="px-3 py-3 font-semibold text-gray-900">{o.code || o._id}</td>
                    <td className="px-3 py-3">{o.customerName || "—"}</td>
                    <td className="px-3 py-3">{new Intl.NumberFormat(undefined, { style: "currency", currency: "AUD" }).format(o.total / 1)}</td>
                    <td className="px-3 py-3">{o.status || "—"}</td>
                    <td className="px-3 py-3 text-gray-500">{o.placedAt ? new Date(o.placedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
