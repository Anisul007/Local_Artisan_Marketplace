import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "artisan_avenue_wishlist_v2";

const WishlistCtx = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], collections: [{ id: "default", name: "All items" }] };
    const parsed = JSON.parse(raw);

    // Migration: old format was an array of items
    if (Array.isArray(parsed)) {
      return { items: parsed.filter(Boolean), collections: [{ id: "default", name: "All items" }] };
    }

    // New format: { items, collections }
    const items = Array.isArray(parsed?.items) ? parsed.items.filter(Boolean) : [];
    const collections = Array.isArray(parsed?.collections) ? parsed.collections.filter(Boolean) : [];
    const safeCollections = collections.length > 0 ? collections : [{ id: "default", name: "All items" }];
    return { items, collections: safeCollections };
  } catch {
    return { items: [], collections: [{ id: "default", name: "All items" }] };
  }
}

export function WishlistProvider({ children }) {
  const initial = readStored();
  const [items, setItems] = useState(() => initial.items);
  const [collections, setCollections] = useState(() => initial.collections);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, collections }));
    } catch {
      // ignore storage errors
    }
  }, [items, collections]);

  const has = useCallback(
    (listingIdOrSlug) =>
      items.some((i) => i.listingId === listingIdOrSlug || i.slug === listingIdOrSlug),
    [items]
  );

  const add = useCallback((item) => {
    if (!item) return;
    const {
      listingId,
      slug,
      title,
      priceCents = 0,
      currency = "AUD",
      imageUrl = "",
      maker = "",
    } = item;
    const key = listingId || slug;
    if (!key) return;

    setItems((prev) => {
      const exists = prev.some((i) => i.listingId === key || i.slug === key);
      if (exists) return prev;
      return [
        {
          listingId: listingId || "",
          slug: slug || "",
          title: title || "Untitled",
          priceCents: Math.max(0, Number(priceCents) || 0),
          currency,
          imageUrl,
          maker,
          collectionId: item.collectionId || "default",
          note: "",
          alertOnPriceDrop: true,
          lastKnownPriceCents: Math.max(0, Number(priceCents) || 0),
          lastCheckedAt: null,
          addedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  }, []);

  const remove = useCallback((listingIdOrSlug) => {
    setItems((prev) =>
      prev.filter((i) => i.listingId !== listingIdOrSlug && i.slug !== listingIdOrSlug)
    );
  }, []);

  const toggle = useCallback(
    (item) => {
      const key = item?.listingId || item?.slug;
      if (!key) return;
      if (has(key)) remove(key);
      else add(item);
    },
    [add, has, remove]
  );

  const clear = useCallback(() => setItems([]), []);

  const updateNote = useCallback((listingIdOrSlug, note) => {
    setItems((prev) =>
      prev.map((i) =>
        i.listingId === listingIdOrSlug || i.slug === listingIdOrSlug
          ? { ...i, note: String(note || "").slice(0, 240) }
          : i
      )
    );
  }, []);

  const setCollectionForItem = useCallback((listingIdOrSlug, collectionId) => {
    setItems((prev) =>
      prev.map((i) =>
        i.listingId === listingIdOrSlug || i.slug === listingIdOrSlug
          ? { ...i, collectionId: collectionId || "default" }
          : i
      )
    );
  }, []);

  const togglePriceAlert = useCallback((listingIdOrSlug) => {
    setItems((prev) =>
      prev.map((i) =>
        i.listingId === listingIdOrSlug || i.slug === listingIdOrSlug
          ? { ...i, alertOnPriceDrop: !i.alertOnPriceDrop }
          : i
      )
    );
  }, []);

  const updatePriceTracking = useCallback((listingIdOrSlug, { priceCents, currency, imageUrl } = {}) => {
    setItems((prev) =>
      prev.map((i) =>
        i.listingId === listingIdOrSlug || i.slug === listingIdOrSlug
          ? {
              ...i,
              priceCents: priceCents != null ? priceCents : i.priceCents,
              currency: currency || i.currency,
              imageUrl: imageUrl || i.imageUrl,
              lastKnownPriceCents: i.lastKnownPriceCents ?? i.priceCents,
              lastCheckedAt: new Date().toISOString(),
            }
          : i
      )
    );
  }, []);

  const createCollection = useCallback((name) => {
    const n = String(name || "").trim();
    if (!n) return null;
    const id = `c_${Math.random().toString(36).slice(2, 10)}`;
    setCollections((prev) => [...prev, { id, name: n }]);
    return id;
  }, []);

  const renameCollection = useCallback((collectionId, name) => {
    const n = String(name || "").trim();
    if (!collectionId || collectionId === "default" || !n) return;
    setCollections((prev) => prev.map((c) => (c.id === collectionId ? { ...c, name: n } : c)));
  }, []);

  const deleteCollection = useCallback((collectionId) => {
    if (!collectionId || collectionId === "default") return;
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    // Move items back to default
    setItems((prev) => prev.map((i) => (i.collectionId === collectionId ? { ...i, collectionId: "default" } : i)));
  }, []);

  const upsertMany = useCallback((incomingItems) => {
    if (!Array.isArray(incomingItems) || incomingItems.length === 0) return 0;
    let added = 0;
    setItems((prev) => {
      const exists = new Set(prev.map((i) => i.listingId || i.slug).filter(Boolean));
      const next = [...prev];
      for (const it of incomingItems) {
        const key = it?.listingId || it?.slug;
        if (!key || exists.has(key)) continue;
        exists.add(key);
        added += 1;
        next.unshift({
          listingId: it.listingId || "",
          slug: it.slug || "",
          title: it.title || "Untitled",
          priceCents: Math.max(0, Number(it.priceCents) || 0),
          currency: it.currency || "AUD",
          imageUrl: it.imageUrl || "",
          maker: it.maker || "",
          collectionId: it.collectionId || "default",
          note: it.note || "",
          alertOnPriceDrop: it.alertOnPriceDrop !== false,
          lastKnownPriceCents: Math.max(0, Number(it.lastKnownPriceCents ?? it.priceCents) || 0),
          lastCheckedAt: null,
          addedAt: it.addedAt || new Date().toISOString(),
        });
      }
      return next;
    });
    return added;
  }, []);

  const count = items.length;

  const value = useMemo(
    () => ({
      items,
      collections,
      count,
      has,
      add,
      remove,
      toggle,
      clear,
      updateNote,
      setCollectionForItem,
      createCollection,
      renameCollection,
      deleteCollection,
      togglePriceAlert,
      updatePriceTracking,
      upsertMany,
    }),
    [
      items,
      collections,
      count,
      has,
      add,
      remove,
      toggle,
      clear,
      updateNote,
      setCollectionForItem,
      createCollection,
      renameCollection,
      deleteCollection,
      togglePriceAlert,
      updatePriceTracking,
      upsertMany,
    ]
  );

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}

