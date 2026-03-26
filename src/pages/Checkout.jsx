import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { OrdersAPI } from "../lib/api";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, subtotalCents, discountCents, cartTotalCents, coupon, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <p className="text-gray-600 mb-4">Please log in to checkout.</p>
        <Link to="/login?next=/checkout" className="text-purple-600 font-semibold hover:underline">Log in</Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Link to="/shop" className="text-purple-600 font-semibold hover:underline">Continue shopping</Link>
      </main>
    );
  }

  async function handlePlaceOrder() {
    setError("");
    setSubmitting(true);
    const payload = {
      items: items.map((i) => ({
        listingId: i.listingId,
        title: i.title,
        quantity: i.quantity,
        priceCents: i.priceCents,
      })).filter((i) => i.listingId),
      shipping: {},
      couponCode: coupon?.code || "",
    };
    if (payload.items.length === 0) {
      setError("Cart items are invalid. Try adding products again.");
      setSubmitting(false);
      return;
    }
    try {
      const r = await OrdersAPI.create(payload);
      const data = r?.data?.data ?? r?.data;
      if (r?.ok && data?.orderId) {
        clearCart();
        navigate(`/orders/${data.orderId}/success`, { replace: true });
        return;
      }
      setError(r?.data?.message || "Could not place order.");
    } catch (e) {
      setError(e?.message || "Could not place order. Try again.");
    }
    setSubmitting(false);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Order review</h1>
      <p className="text-gray-600 mb-6">Confirm your items and total before placing the order.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
      )}

      <div className="space-y-3 mb-8">
        {items.map((item) => (
          <div key={item.listingId || item.slug} className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="font-medium text-gray-900">{item.title} × {item.quantity}</span>
            <span>{money(item.priceCents * item.quantity, item.currency)}</span>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 mb-6 space-y-1">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{money(subtotalCents)}</span>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Discount{coupon?.code ? ` (${coupon.code})` : ""}</span>
            <span>-{money(discountCents)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
          <span>Total</span>
          <span>{money(cartTotalCents)}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        A confirmation email will be sent after you place the order.
      </p>
      <button
        type="button"
        disabled={submitting}
        className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 transition disabled:opacity-70"
        onClick={handlePlaceOrder}
      >
        {submitting ? "Placing order…" : "Confirm and place order"}
      </button>
      <Link to="/cart" className="mt-4 block text-center text-gray-600 hover:text-gray-900 text-sm">
        Back to cart
      </Link>
    </main>
  );
}
