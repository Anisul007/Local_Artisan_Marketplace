import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { OrdersAPI } from "../../lib/api";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

function sortOrderMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return [...messages].sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
}

function threadLabel(fromRole) {
  if (fromRole === "customer") return "You";
  if (fromRole === "vendor") return "Vendor";
  if (fromRole === "system") return "Platform";
  return fromRole || "Message";
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState("");
  const [msgDraft, setMsgDraft] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgErr, setMsgErr] = useState("");
  const [msgOk, setMsgOk] = useState("");

  const refreshOrder = useCallback(async () => {
    if (!orderId) return;
    const r = await OrdersAPI.get(orderId).catch(() => null);
    if (r?.ok && r?.data?.data) setOrder(r.data.data);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    OrdersAPI.get(orderId)
      .then((r) => {
        if (r?.ok && r?.data?.data) setOrder(r.data.data);
        else setErr("Order not found");
      })
      .catch(() => setErr("Could not load order"));
  }, [orderId]);

  async function sendCustomerMessage() {
    const text = String(msgDraft || "").trim();
    if (!text || !orderId) return;
    setMsgBusy(true);
    setMsgErr("");
    setMsgOk("");
    try {
      const r = await OrdersAPI.sendMessage(orderId, text);
      if (!r?.ok) throw new Error(r?.data?.message || "Could not send message");
      setMsgDraft("");
      setMsgOk("Message sent. Vendors on this order have been notified.");
      await refreshOrder();
    } catch (e) {
      setMsgErr(e?.message || "Could not send message");
    } finally {
      setMsgBusy(false);
    }
  }

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

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
          <h2 className="text-sm font-semibold text-gray-900">Messages about this order</h2>
          <p className="mt-1 text-xs text-gray-500">
            Chat with vendors on this order. Platform updates appear here too.
          </p>
          {sortOrderMessages(order.messages).length === 0 ? (
            <p className="mt-3 text-sm text-gray-600">No messages yet. Say hello or ask a question below.</p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {sortOrderMessages(order.messages).map((m) => (
                <li
                  key={m._id || `${m.sentAt}-${String(m.text || "").slice(0, 12)}`}
                  className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">{threadLabel(m.fromRole)}</span>
                    {m.sentAt ? ` · ${new Date(m.sentAt).toLocaleString()}` : ""}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-gray-800">{m.text}</p>
                </li>
              ))}
            </ul>
          )}
          {msgErr ? <p className="mt-2 text-sm text-red-600">{msgErr}</p> : null}
          {msgOk ? <p className="mt-2 text-sm text-emerald-700">{msgOk}</p> : null}
          <textarea
            value={msgDraft}
            onChange={(e) => setMsgDraft(e.target.value)}
            rows={3}
            placeholder="Write a message to the vendor(s) on this order…"
            className="mt-3 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
          />
          <button
            type="button"
            disabled={msgBusy || !msgDraft.trim()}
            onClick={sendCustomerMessage}
            className="mt-2 w-full rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 sm:w-auto sm:px-6"
          >
            {msgBusy ? "Sending…" : "Send message"}
          </button>
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
