import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";

const CART_STORAGE_KEY = "artisan_avenue_cart";

const CartCtx = createContext(null);

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

/** Cart item: { listingId, slug, title, priceCents, quantity, imageUrl, currency } */
/** Coupon: { code, discountCents, promotionName } from validateCoupon */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [coupon, setCoupon] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  // Auto-dismiss toast notifications
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const pushToast = useCallback((next) => {
    setToast(next);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const addItem = useCallback((item) => {
    const { listingId, slug, title, priceCents, quantity = 1, imageUrl, currency = "AUD" } = item;
    if (!listingId && !slug) return;
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.listingId === listingId || (i.slug === slug && slug)
      );
      if (existing) {
        const addQty = quantity || 1;
        const newQty = (existing.quantity || 0) + addQty;
        pushToast({
          variant: "success",
          message:
            newQty > 1
              ? `${title || "Item"} added to cart (${newQty})`
              : `${title || "Item"} added to cart`,
        });
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + (quantity || 1) } : i
        );
      }
      pushToast({
        variant: "success",
        message: `${title || "Item"} added to cart`,
      });
      return [
        ...prev,
        {
          listingId: listingId || null,
          slug: slug || null,
          title: title || "Product",
          priceCents: Number(priceCents) || 0,
          quantity: quantity || 1,
          imageUrl: imageUrl || "",
          currency: currency || "AUD",
        },
      ];
    });
  }, [pushToast]);

  const removeItem = useCallback((listingIdOrSlug) => {
    setItems((prev) =>
      prev.filter(
        (i) => i.listingId !== listingIdOrSlug && i.slug !== listingIdOrSlug
      )
    );
  }, []);

  const updateQuantity = useCallback((listingIdOrSlug, quantity) => {
    const q = Math.max(0, Math.floor(Number(quantity)) || 0);
    setItems((prev) => {
      if (q === 0) {
        return prev.filter(
          (i) => i.listingId !== listingIdOrSlug && i.slug !== listingIdOrSlug
        );
      }
      return prev.map((i) =>
        i.listingId === listingIdOrSlug || i.slug === listingIdOrSlug
          ? { ...i, quantity: q }
          : i
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, []);

  const clearCoupon = useCallback(() => setCoupon(null), []);

  const cartCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const subtotalCents = items.reduce(
    (sum, i) => sum + (i.priceCents || 0) * (i.quantity || 0),
    0
  );
  const discountCents = coupon?.discountCents ?? 0;
  const cartTotalCents = Math.max(0, subtotalCents - discountCents);

  return (
    <CartCtx.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearCoupon,
        cartCount,
        subtotalCents,
        discountCents,
        cartTotalCents,
        coupon,
        setCoupon,
      }}
    >
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-[9999] -translate-x-1/2"
        >
          <div className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-emerald-500/30">
            {toast.message}
          </div>
        </div>
      )}
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
