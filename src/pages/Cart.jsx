import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { validateCoupon } from "../lib/api";
import { ShoppingCart, Trash2, Minus, Plus, Ticket } from "lucide-react";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

export default function Cart() {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotalCents,
    discountCents,
    cartTotalCents,
    coupon,
    setCoupon,
    clearCoupon,
  } = useCart();
  const [codeInput, setCodeInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  if (items.length === 0) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center max-w-md">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add items from the shop to get started.</p>
          <Link
            to="/shop"
            className="inline-block rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 transition"
          >
            Browse shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Shopping cart</h1>

      <div className="space-y-4">
        {items.map((item) => {
          const key = item.listingId || item.slug || item.title;
          const productUrl = item.slug ? `/product/${item.slug}` : "#";
          return (
            <div
              key={key}
              className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <Link to={productUrl} className="shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-100">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/placeholder.svg"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={productUrl} className="font-semibold text-gray-900 hover:text-purple-600 line-clamp-2">
                  {item.title}
                </Link>
                <p className="text-gray-600 mt-0.5">{money(item.priceCents * item.quantity, item.currency)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      onClick={() => updateQuantity(item.listingId || item.slug, item.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                      onClick={() => updateQuantity(item.listingId || item.slug, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove from cart"
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    onClick={() => removeItem(item.listingId || item.slug)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-gray-900">{money(item.priceCents * item.quantity, item.currency)}</p>
                <p className="text-xs text-gray-500">{money(item.priceCents, item.currency)} each</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-6 rounded-xl border border-gray-200 bg-gray-50">
        {!coupon ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCouponError(""); }}
              placeholder="Coupon code"
              className="flex-1 min-w-[120px] rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase placeholder:normal-case"
            />
            <button
              type="button"
              disabled={couponLoading || !codeInput.trim()}
              onClick={async () => {
                setCouponError("");
                setCouponLoading(true);
                try {
                  const res = await validateCoupon(codeInput.trim(), items.map((i) => ({
                    listingId: i.listingId || i.slug,
                    quantity: i.quantity,
                  })));
                  const data = res?.data?.data ?? res?.data ?? {};
                  if (data.valid && data.discountCents > 0) {
                    setCoupon({ code: codeInput.trim().toUpperCase(), discountCents: data.discountCents, promotionName: data.promotionName || "" });
                    setCodeInput("");
                  } else {
                    setCouponError(data.message || "Invalid or expired code");
                  }
                } catch {
                  setCouponError("Could not validate code");
                } finally {
                  setCouponLoading(false);
                }
              }}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {couponLoading ? "Checking…" : "Apply"}
            </button>
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span><Ticket className="inline w-4 h-4 mr-1" /> {coupon.code} applied{coupon.promotionName ? ` — ${coupon.promotionName}` : ""}</span>
            <button type="button" onClick={clearCoupon} className="font-medium hover:underline">Remove</button>
          </div>
        )}
        {couponError && <p className="mb-4 text-sm text-red-600">{couponError}</p>}
        <div className="space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{money(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span>-{money(discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-lg font-semibold pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{money(cartTotalCents)}</span>
          </div>
        </div>
        <Link
          to="/checkout"
          className="mt-4 block w-full text-center rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 transition"
        >
          Proceed to checkout
        </Link>
        <Link to="/shop" className="mt-3 block text-center text-sm text-gray-600 hover:text-gray-900">
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
