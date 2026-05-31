import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";

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

const VENDOR_PURCHASE_MSG =
  "Vendor accounts cannot buy on the marketplace. Sign in with a customer account to purchase.";

export function parseStockQty(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function mergeStockQty(incoming, existingStockQty) {
  const next = parseStockQty(incoming);
  if (next !== null) return next;
  return parseStockQty(existingStockQty);
}

export function isAtStockLimit(cartEntry, stockQty) {
  const limit = mergeStockQty(stockQty, cartEntry?.stockQty);
  if (limit === null) return false;
  return (Number(cartEntry?.quantity) || 0) >= limit;
}

export function isOutOfStock(stockQty) {
  const limit = parseStockQty(stockQty);
  return limit === 0;
}

/** Cart item: { listingId, slug, title, priceCents, quantity, imageUrl, currency, stockQty } */
/** Coupon: { code, discountCents, promotionName } from validateCoupon */
export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState(loadCart);
  const [coupon, setCoupon] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const purchaseBlocked =
    !!user && (user.role === "vendor" || user.isVendor === true);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const pushToast = useCallback((next) => {
    setToast(next);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const ms = next?.variant === "error" ? 4200 : 2200;
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

  const addItem = useCallback(
    (item) => {
      if (purchaseBlocked) {
        pushToast({ variant: "error", message: VENDOR_PURCHASE_MSG });
        return { ok: false };
      }

      const {
        listingId,
        slug,
        title,
        priceCents,
        quantity = 1,
        imageUrl,
        currency = "AUD",
        stockQty,
      } = item;

      if (!listingId && !slug) return { ok: false };

      const addQty = Math.max(1, Math.floor(Number(quantity)) || 1);
      const label = title || "This item";
      let blocked = false;
      let blockedMessage = "";
      let successMessage = "";

      setItems((prev) => {
        const existing = prev.find(
          (i) => i.listingId === listingId || (i.slug === slug && slug)
        );
        const limit = mergeStockQty(stockQty, existing?.stockQty);

        if (limit === 0) {
          blocked = true;
          blockedMessage = `${label} is out of stock.`;
          return prev;
        }

        const currentQty = Number(existing?.quantity) || 0;
        const attemptedQty = currentQty + addQty;

        if (limit !== null && attemptedQty > limit) {
          blocked = true;
          blockedMessage =
            currentQty > 0
              ? `Only ${limit} left in stock for ${label}. You already have ${currentQty} in your cart.`
              : `Only ${limit} left in stock for ${label}.`;
          return prev;
        }

        const nextPriceCents = Number(priceCents);

        if (existing) {
          const newQty = currentQty + addQty;
          successMessage =
            newQty > 1
              ? `${label} added to cart (${newQty})`
              : `${label} added to cart`;
          return prev.map((i) =>
            i === existing
              ? {
                  ...i,
                  quantity: newQty,
                  stockQty: limit ?? i.stockQty ?? null,
                  priceCents:
                    Number.isFinite(nextPriceCents) && nextPriceCents > 0
                      ? nextPriceCents
                      : i.priceCents,
                  currency: currency || i.currency || "AUD",
                  title: title || i.title,
                  imageUrl: imageUrl || i.imageUrl || "",
                }
              : i
          );
        }

        successMessage = `${label} added to cart`;
        return [
          ...prev,
          {
            listingId: listingId || null,
            slug: slug || null,
            title: title || "Product",
            priceCents: Number(priceCents) || 0,
            quantity: addQty,
            imageUrl: imageUrl || "",
            currency: currency || "AUD",
            stockQty: limit,
          },
        ];
      });

      if (blocked) {
        pushToast({ variant: "error", message: blockedMessage });
        return { ok: false };
      }

      pushToast({ variant: "success", message: successMessage });
      return { ok: true };
    },
    [pushToast, purchaseBlocked]
  );

  const removeItem = useCallback((listingIdOrSlug) => {
    setItems((prev) =>
      prev.filter(
        (i) => i.listingId !== listingIdOrSlug && i.slug !== listingIdOrSlug
      )
    );
  }, []);

  const updateQuantity = useCallback(
    (listingIdOrSlug, quantity) => {
      const q = Math.max(0, Math.floor(Number(quantity)) || 0);
      let blocked = false;
      let blockedMessage = "";

      setItems((prev) => {
        const item = prev.find(
          (i) => i.listingId === listingIdOrSlug || i.slug === listingIdOrSlug
        );
        if (!item) return prev;

        if (purchaseBlocked) {
          if (q > (item.quantity || 0)) {
            blocked = true;
            blockedMessage = VENDOR_PURCHASE_MSG;
            return prev;
          }
        }

        const limit = parseStockQty(item.stockQty);
        if (limit !== null && q > limit) {
          blocked = true;
          blockedMessage = `Only ${limit} left in stock for ${item.title || "this item"}.`;
          return prev;
        }

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

      if (blocked) {
        pushToast({ variant: "error", message: blockedMessage });
        return { ok: false };
      }
      return { ok: true };
    },
    [purchaseBlocked, pushToast]
  );

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

  const toastTone =
    toast?.variant === "error"
      ? "bg-red-600 ring-red-500/30"
      : "bg-emerald-600 ring-emerald-500/30";

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
        purchaseBlocked,
        vendorPurchaseMessage: VENDOR_PURCHASE_MSG,
      }}
    >
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-[9999] max-w-md -translate-x-1/2 px-3"
        >
          <div
            className={`rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg ring-1 ${toastTone}`}
          >
            {toast.message}
          </div>
        </div>
      )}
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
