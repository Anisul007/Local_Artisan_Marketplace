import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { OrdersAPI } from "../../lib/api";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

function parseAddressText(raw = "") {
  const txt = String(raw || "").trim();
  if (!txt) return { line1: "", city: "", state: "", postcode: "" };
  const parts = txt.split(",").map((p) => p.trim()).filter(Boolean);
  const line1 = parts[0] || txt;
  const tail = parts.slice(1).join(" ");
  const postcodeMatch = tail.match(/\b(\d{4})\b/);
  const postcode = postcodeMatch ? postcodeMatch[1] : "";
  const stateMatch = tail.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
  const state = stateMatch ? stateMatch[1].toUpperCase() : "";
  const city = tail
    .replace(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/gi, "")
    .replace(/\b\d{4}\b/g, "")
    .trim();
  return { line1, city, state, postcode };
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, subtotalCents, discountCents, cartTotalCents, coupon, clearCart, purchaseBlocked, vendorPurchaseMessage } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });
  const [shipping, setShipping] = useState(() => ({
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim(),
    line1: "",
    line2: "",
    city: "",
    state: "",
    postcode: "",
    country: "AU",
    phone: "",
    notes: "",
  }));

  useEffect(() => {
    if (!user) return;
    const parsed = parseAddressText(user.address || "");
    const structured = user.shippingAddress || {};
    setShipping((s) => ({
      ...s,
      fullName: s.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
      line1: s.line1 || String(structured.line1 || "").trim() || parsed.line1,
      line2: s.line2 || String(structured.line2 || "").trim(),
      city: s.city || String(structured.city || "").trim() || parsed.city,
      state: s.state || String(structured.state || "").trim() || parsed.state,
      postcode: s.postcode || String(structured.postcode || "").trim() || parsed.postcode,
      country: s.country || String(structured.country || "").trim() || "AU",
      phone: s.phone || String(structured.phone || "").trim(),
    }));
  }, [user]);

  if (!user) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <p className="text-gray-600 mb-4">Please log in to checkout.</p>
        <Link to="/login?next=/checkout" className="text-purple-600 font-semibold hover:underline">Log in</Link>
      </main>
    );
  }

  if (purchaseBlocked) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Checkout not available</h1>
        <p className="text-gray-600 mb-6">{vendorPurchaseMessage}</p>
        <Link to="/shop" className="text-purple-600 font-semibold hover:underline">Back to shop</Link>
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
    if (!shipping.fullName.trim()) return setError("Full name is required.");
    if (!shipping.line1.trim()) return setError("Address line 1 is required.");
    if (!shipping.city.trim()) return setError("City is required.");
    if (!shipping.postcode.trim()) return setError("Postcode is required.");
    if (!payment.cardName.trim()) return setError("Card holder name is required.");
    if (!payment.cardNumber.trim()) return setError("Card number is required.");
    if (!payment.expiry.trim()) return setError("Card expiry is required.");
    if (!payment.cvc.trim()) return setError("CVC is required.");
    setSubmitting(true);
    const payload = {
      items: items.map((i) => ({
        listingId: i.listingId,
        title: i.title,
        quantity: i.quantity,
        priceCents: i.priceCents,
      })).filter((i) => i.listingId),
      shipping: {
        fullName: shipping.fullName.trim(),
        line1: shipping.line1.trim(),
        line2: shipping.line2.trim(),
        city: shipping.city.trim(),
        state: shipping.state.trim(),
        postcode: shipping.postcode.trim(),
        country: shipping.country.trim() || "AU",
        phone: shipping.phone.trim(),
        notes: shipping.notes.trim(),
      },
      couponCode: coupon?.code || "",
      payment: {
        cardName: payment.cardName.trim(),
        cardNumber: payment.cardNumber.trim(),
        expiry: payment.expiry.trim(),
        cvc: payment.cvc.trim(),
      },
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

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Shipping details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={shipping.fullName}
            onChange={(e) => setShipping((s) => ({ ...s, fullName: e.target.value }))}
            placeholder="Full name *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={shipping.phone}
            onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
            placeholder="Phone"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={shipping.line1}
            onChange={(e) => setShipping((s) => ({ ...s, line1: e.target.value }))}
            placeholder="Address line 1 *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={shipping.line2}
            onChange={(e) => setShipping((s) => ({ ...s, line2: e.target.value }))}
            placeholder="Address line 2"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={shipping.city}
            onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
            placeholder="City *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={shipping.state}
            onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
            placeholder="State"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={shipping.postcode}
            onChange={(e) => setShipping((s) => ({ ...s, postcode: e.target.value }))}
            placeholder="Postcode *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={shipping.country}
            onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
            placeholder="Country"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea
            value={shipping.notes}
            onChange={(e) => setShipping((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Delivery notes (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
            rows={3}
          />
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={payment.cardName}
            onChange={(e) => setPayment((p) => ({ ...p, cardName: e.target.value }))}
            placeholder="Card holder name *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={payment.cardNumber}
            onChange={(e) => setPayment((p) => ({ ...p, cardNumber: e.target.value }))}
            placeholder="Card number *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={payment.expiry}
            onChange={(e) => setPayment((p) => ({ ...p, expiry: e.target.value }))}
            placeholder="Expiry (MM/YY) *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={payment.cvc}
            onChange={(e) => setPayment((p) => ({ ...p, cvc: e.target.value }))}
            placeholder="CVC *"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Payment is processed first, then your order is created and confirmed by email.
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
