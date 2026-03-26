import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { OrdersAPI } from "../lib/api";
import { Package, ChevronRight } from "lucide-react";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

const STATUS_LABELS = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function MyOrders() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    OrdersAPI.list()
      .then((r) => {
        const data = r?.data?.data ?? r?.data;
        if (r?.ok && Array.isArray(data?.orders)) setOrders(data.orders);
        else setErr("Could not load orders");
      })
      .catch(() => setErr("Could not load orders"));
  }, [user]);

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse rounded-xl bg-gray-200 h-32 w-full" />
      </main>
    );
  }

  if (!user) {
    navigate("/login?next=/orders", { replace: true });
    return null;
  }

  if (err) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-red-600">{err}</p>
        <Link to="/" className="text-purple-600 font-semibold mt-2 inline-block">Back to home</Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My orders</h1>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
          <Package className="w-14 h-14 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">You haven’t placed any orders yet.</p>
          <Link to="/shop" className="inline-block rounded-xl bg-purple-600 px-5 py-2.5 font-semibold text-white hover:bg-purple-700">
            Browse shop
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusLabel = STATUS_LABELS[order.status] || order.status;
            const isDelivered = order.status === "delivered";
            const estimatedDelivery = order.estimatedDelivery
              ? new Date(order.estimatedDelivery).toLocaleDateString()
              : "—";
            return (
              <Link
                key={order._id}
                to={`/orders/${order._id}/success`}
                className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {order.items?.length} item(s) · {money(order.totalCents, order.currency)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Placed {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"} · Est. delivery {estimatedDelivery}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        order.status === "delivered"
                          ? "bg-green-100 text-green-800"
                          : order.status === "shipped"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "cancelled"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {statusLabel}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                {isDelivered && (
                  <p className="mt-2 text-xs text-purple-600">Tap to view details or leave a review</p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link to="/shop" className="text-purple-600 font-semibold hover:underline">Continue shopping</Link>
      </div>
    </main>
  );
}
