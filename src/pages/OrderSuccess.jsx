import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { OrdersAPI } from "../lib/api";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!orderId) return;
    OrdersAPI.get(orderId)
      .then((r) => {
        if (r?.ok && r?.data?.data) setOrder(r.data.data);
        else setErr("Order not found");
      })
      .catch(() => setErr("Could not load order"));
  }, [orderId]);

  if (err) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">{err}</p>
        <Link to="/orders" className="text-purple-600 font-semibold hover:underline">View my orders</Link>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 flex justify-center">
        <div className="animate-pulse rounded-xl bg-gray-200 h-48 w-full" />
      </main>
    );
  }

  const estimatedDelivery = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })
    : "—";

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order confirmed</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your order. We’ve sent a confirmation email to your inbox.
        </p>

        <div className="text-left rounded-xl bg-gray-50 p-4 mb-6">
          <p className="font-semibold text-gray-900">Order number</p>
          <p className="text-lg font-mono text-purple-600">{order.orderNumber}</p>
          <p className="mt-2 text-sm text-gray-600">Total: {money(order.totalCents, order.currency)}</p>
          <p className="text-sm text-gray-600">Estimated delivery: {estimatedDelivery}</p>
        </div>

        <div className="space-y-2 mb-6">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-gray-700">{item.title} × {item.quantity}</span>
              <span>{money(item.priceCents * item.quantity, item.currency)}</span>
            </div>
          ))}
        </div>
        {order.status === "delivered" && order.items?.some((i) => i.slug) && (
          <div className="text-sm text-gray-600 mb-4 text-left">
            <p className="mb-2">Leave a review:</p>
            <ul className="space-y-1">
              {order.items.filter((i) => i.slug).map((item, i) => (
                <li key={i}>
                  <Link to={`/product/${item.slug}`} className="text-purple-600 font-medium hover:underline">{item.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/orders"
            className="inline-block rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 transition"
          >
            View my orders
          </Link>
          <Link
            to="/shop"
            className="inline-block rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
