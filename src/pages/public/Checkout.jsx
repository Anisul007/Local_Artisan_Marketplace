import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Truck,
  Zap,
  CreditCard,
  ShieldCheck,
  Lock,
  Package,
  Sparkles,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { OrdersAPI } from "../../lib/api";
import { PaymentMethodLogo } from "../../components/checkout/PaymentMethodLogos";

const DELIVERY_OPTIONS = [
  {
    id: "standard",
    label: "Standard delivery",
    eta: "5–7 business days",
    cents: 995,
    blurb: "Tracked parcel · best value",
    Icon: Truck,
  },
  {
    id: "express",
    label: "Express delivery",
    eta: "2–3 business days",
    cents: 1995,
    blurb: "Priority dispatch · faster arrival",
    Icon: Zap,
  },
];

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Debit / credit card",
    hint: "Visa, Mastercard, Amex",
  },
  {
    id: "paypal",
    label: "PayPal",
    hint: "Secure PayPal checkout",
  },
  {
    id: "afterpay",
    label: "Afterpay",
    hint: "Pay in 4 interest-free instalments",
  },
  {
    id: "google_pay",
    label: "Google Pay",
    hint: "One-tap wallet payment",
  },
];

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

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-200";

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, subtotalCents, discountCents, coupon, clearCart, purchaseBlocked, vendorPurchaseMessage } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");
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

  const shippingCents = useMemo(
    () => DELIVERY_OPTIONS.find((d) => d.id === deliveryMethod)?.cents ?? 995,
    [deliveryMethod]
  );
  const orderTotalCents = Math.max(0, subtotalCents - discountCents + shippingCents);

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
        <Link to="/login?next=/checkout" className="text-purple-600 font-semibold hover:underline">
          Log in
        </Link>
      </main>
    );
  }

  if (purchaseBlocked) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Checkout not available</h1>
        <p className="text-gray-600 mb-6">{vendorPurchaseMessage}</p>
        <Link to="/shop" className="text-purple-600 font-semibold hover:underline">
          Back to shop
        </Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Link to="/shop" className="text-purple-600 font-semibold hover:underline">
          Continue shopping
        </Link>
      </main>
    );
  }

  async function handlePlaceOrder() {
    setError("");
    if (!shipping.fullName.trim()) return setError("Full name is required.");
    if (!shipping.line1.trim()) return setError("Address line 1 is required.");
    if (!shipping.city.trim()) return setError("City is required.");
    if (!shipping.postcode.trim()) return setError("Postcode is required.");

    if (paymentMethod === "card") {
      if (!payment.cardName.trim()) return setError("Card holder name is required.");
      if (!payment.cardNumber.trim()) return setError("Card number is required.");
      if (!payment.expiry.trim()) return setError("Card expiry is required.");
      if (!payment.cvc.trim()) return setError("CVC is required.");
    }

    setSubmitting(true);
    const payload = {
      items: items
        .map((i) => ({
          listingId: i.listingId,
          title: i.title,
          quantity: i.quantity,
          priceCents: i.priceCents,
        }))
        .filter((i) => i.listingId),
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
        deliveryMethod,
      },
      couponCode: coupon?.code || "",
      payment: {
        method: paymentMethod,
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
        window.dispatchEvent(new Event("marketplace-order-placed"));
        window.dispatchEvent(new Event("customer-notifications-changed"));
        navigate(`/orders/${data.orderId}/success`, { replace: true });
        return;
      }
      setError(r?.data?.message || "Could not place order.");
    } catch (e) {
      setError(e?.message || "Could not place order. Try again.");
    }
    setSubmitting(false);
  }

  const selectedPayment = PAYMENT_METHODS.find((p) => p.id === paymentMethod);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/80 via-white to-amber-50/40">
      <div className="border-b border-purple-100/80 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-purple-600 to-violet-700 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">Secure checkout</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Complete your order</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Review items, choose delivery, and pay with your preferred method.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Delivery */}
            <section className="rounded-2xl border border-gray-200/80 bg-white p-5 md:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">Delivery option</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {DELIVERY_OPTIONS.map((opt) => {
                  const selected = deliveryMethod === opt.id;
                  const Icon = opt.Icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDeliveryMethod(opt.id)}
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        selected
                          ? "border-purple-600 bg-purple-50/80 ring-2 ring-purple-200"
                          : "border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`grid h-9 w-9 place-items-center rounded-xl ${
                              selected ? "bg-purple-600 text-white" : "bg-white text-purple-700 ring-1 ring-gray-200"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900">{opt.label}</div>
                            <div className="text-xs text-gray-500">{opt.eta}</div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-purple-700">{money(opt.cents)}</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-600">{opt.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Shipping address */}
            <section className="rounded-2xl border border-gray-200/80 bg-white p-5 md:p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping details</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={shipping.fullName}
                  onChange={(e) => setShipping((s) => ({ ...s, fullName: e.target.value }))}
                  placeholder="Full name *"
                  className={inputClass}
                />
                <input
                  value={shipping.phone}
                  onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="Phone"
                  className={inputClass}
                />
                <input
                  value={shipping.line1}
                  onChange={(e) => setShipping((s) => ({ ...s, line1: e.target.value }))}
                  placeholder="Address line 1 *"
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  value={shipping.line2}
                  onChange={(e) => setShipping((s) => ({ ...s, line2: e.target.value }))}
                  placeholder="Address line 2"
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  value={shipping.city}
                  onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                  placeholder="City *"
                  className={inputClass}
                />
                <input
                  value={shipping.state}
                  onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                  placeholder="State"
                  className={inputClass}
                />
                <input
                  value={shipping.postcode}
                  onChange={(e) => setShipping((s) => ({ ...s, postcode: e.target.value }))}
                  placeholder="Postcode *"
                  className={inputClass}
                />
                <input
                  value={shipping.country}
                  onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                  placeholder="Country"
                  className={inputClass}
                />
                <textarea
                  value={shipping.notes}
                  onChange={(e) => setShipping((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Delivery notes (optional)"
                  className={`${inputClass} sm:col-span-2`}
                  rows={3}
                />
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-2xl border border-gray-200/80 bg-white p-5 md:p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">Payment method</h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_METHODS.map((pm) => {
                  const selected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition ${
                        selected
                          ? "border-purple-600 bg-purple-50 ring-2 ring-purple-200"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <PaymentMethodLogo method={pm.id} />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{pm.label}</span>
                        <span className="block text-xs text-gray-500">{pm.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {paymentMethod === "card" ? (
                <div className="mt-5 rounded-2xl border border-dashed border-purple-200 bg-gradient-to-br from-purple-50/60 to-white p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-purple-800">Card details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={payment.cardName}
                      onChange={(e) => setPayment((p) => ({ ...p, cardName: e.target.value }))}
                      placeholder="Card holder name *"
                      className={`${inputClass} sm:col-span-2`}
                    />
                    <input
                      value={payment.cardNumber}
                      onChange={(e) => setPayment((p) => ({ ...p, cardNumber: e.target.value }))}
                      placeholder="Card number *"
                      className={`${inputClass} sm:col-span-2`}
                    />
                    <input
                      value={payment.expiry}
                      onChange={(e) => setPayment((p) => ({ ...p, expiry: e.target.value }))}
                      placeholder="Expiry (MM/YY) *"
                      className={inputClass}
                    />
                    <input
                      value={payment.cvc}
                      onChange={(e) => setPayment((p) => ({ ...p, cvc: e.target.value }))}
                      placeholder="CVC *"
                      className={inputClass}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    You’ll complete payment with {selectedPayment?.label}
                  </p>
                  <p className="mt-1 text-xs text-emerald-800/90">
                    After you place the order, you’ll be redirected to {selectedPayment?.label} to authorise payment
                    securely (demo flow for this project).
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> Encrypted checkout
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Buyer protection
                </span>
              </div>
            </section>
          </div>

          {/* Order summary sidebar */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg ring-1 ring-purple-100">
              <div className="bg-gradient-to-r from-purple-700 to-violet-600 px-5 py-4 text-white">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <h2 className="text-lg font-bold">Order summary</h2>
                </div>
                <p className="text-xs text-purple-100 mt-1">{items.length} item(s) in your bag</p>
              </div>

              <div className="max-h-64 overflow-y-auto px-5 py-3 divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.listingId || item.slug} className="flex justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 line-clamp-2">{item.title}</p>
                      <p className="text-xs text-gray-500">Qty {item.quantity}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-gray-900">
                      {money(item.priceCents * item.quantity, item.currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-gray-100 bg-gray-50/80 px-5 py-4 text-sm">
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
                <div className="flex justify-between text-gray-600">
                  <span>
                    Shipping · {deliveryMethod === "express" ? "Express" : "Standard"}
                  </span>
                  <span>{money(shippingCents)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-purple-700">{money(orderTotalCents)}</span>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  type="button"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:from-purple-500 hover:to-violet-500 disabled:opacity-70"
                  onClick={handlePlaceOrder}
                >
                  {submitting ? "Placing order…" : `Pay ${money(orderTotalCents)}`}
                </button>
                <Link to="/cart" className="mt-3 block text-center text-sm text-gray-500 hover:text-gray-800">
                  ← Back to cart
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
