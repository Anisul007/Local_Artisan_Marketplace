import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { Search, ArrowUpDown, Trash2, ShoppingCart, HeartOff, Sparkles, Share2, Download, Bell, Tag } from "lucide-react";
import { PublicListingsAPI } from "../lib/api";

const PLACEHOLDER = "/images/placeholder.svg";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

export default function Wishlist() {
  const {
    items,
    collections,
    clear,
    remove,
    updateNote,
    setCollectionForItem,
    createCollection,
    renameCollection,
    deleteCollection,
    togglePriceAlert,
    updatePriceTracking,
    upsertMany,
  } = useWishlist();
  const { addItem } = useCart();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest"); // newest | oldest | price_asc | price_desc | name
  const [collectionId, setCollectionId] = useState("all"); // all | default | c_xxx
  const [banner, setBanner] = useState("");
  const [checking, setChecking] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  // -------- share/import helpers --------
  const encodeShare = (payload) => {
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };
  const decodeShare = (token) => {
    const b64 = String(token || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(json);
  };

  const shareLink = useMemo(() => {
    const payload = {
      v: 1,
      items: items.map((i) => ({
        listingId: i.listingId,
        slug: i.slug,
        title: i.title,
        priceCents: i.priceCents,
        currency: i.currency,
        imageUrl: i.imageUrl,
        maker: i.maker,
        note: i.note,
        collectionId: i.collectionId || "default",
        addedAt: i.addedAt,
      })),
      collections: (collections || []).filter((c) => c.id !== "default"),
    };
    const t = encodeShare(payload);
    const url = new URL(window.location.href);
    url.searchParams.set("share", t);
    url.searchParams.delete("import");
    return url.toString();
  }, [items, collections]);

  useEffect(() => {
    // Import on load: /wishlist?import=... or /wishlist?share=...
    const token = sp.get("import") || sp.get("share");
    if (!token) return;
    try {
      const payload = decodeShare(token);
      const incomingItems = Array.isArray(payload?.items) ? payload.items : [];
      const added = upsertMany(incomingItems);
      // merge collections
      const incomingCollections = Array.isArray(payload?.collections) ? payload.collections : [];
      if (incomingCollections.length > 0) {
        incomingCollections.forEach((c) => createCollection(c?.name || ""));
      }
      setBanner(added > 0 ? `Imported ${added} item(s) to your wishlist.` : "Nothing new to import.");
    } catch {
      setBanner("Invalid share link.");
    }
    const n = new URLSearchParams(sp);
    n.delete("import");
    n.delete("share");
    setSp(n, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkPriceDrops() {
    if (items.length === 0) return;
    setChecking(true);
    try {
      await Promise.all(
        items.map(async (it) => {
          const key = it.listingId || it.slug;
          if (!key) return;
          const idOrSlug = it.slug || it.listingId;
          const res = await PublicListingsAPI.read(idOrSlug);
          if (!res?.ok) return;
          const p = res?.data?.data ?? res?.data;
          const latest = p?.pricing?.priceCents;
          const currency = p?.pricing?.currency || it.currency;
          const img = p?.images?.find?.((i) => i?.isPrimary)?.url || p?.images?.[0]?.url || it.imageUrl;
          if (typeof latest === "number") {
            updatePriceTracking(key, { priceCents: latest, currency, imageUrl: img });
          }
        })
      );
      setBanner("Prices refreshed.");
    } catch {
      setBanner("Could not refresh prices right now.");
    }
    setChecking(false);
  }

  useEffect(() => {
    // Auto check once when opening wishlist
    checkPriceDrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items;
    if (collectionId !== "all") {
      list = list.filter((i) => (i.collectionId || "default") === collectionId);
    }
    if (needle) {
      list = list.filter((i) => {
        const hay = `${i.title || ""} ${i.maker || ""}`.toLowerCase();
        return hay.includes(needle);
      });
    }
    const sorters = {
      newest: (a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")),
      oldest: (a, b) => String(a.addedAt || "").localeCompare(String(b.addedAt || "")),
      price_asc: (a, b) => (a.priceCents || 0) - (b.priceCents || 0),
      price_desc: (a, b) => (b.priceCents || 0) - (a.priceCents || 0),
      name: (a, b) => String(a.title || "").localeCompare(String(b.title || "")),
    };
    return [...list].sort(sorters[sort] || sorters.newest);
  }, [items, q, sort]);

  const totalCents = useMemo(() => filtered.reduce((sum, i) => sum + (i.priceCents || 0), 0), [filtered]);
  const drops = useMemo(() => {
    return filtered.filter((i) => i.alertOnPriceDrop && i.lastKnownPriceCents != null && i.priceCents < i.lastKnownPriceCents);
  }, [filtered]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Wishlist</h1>
          <p className="text-gray-600 mt-1">
            Save items you love. Add notes, sort your picks, and move them to your cart when you’re ready.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {items.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareLink);
                  setBanner("Share link copied.");
                } catch {
                  setBanner("Copy failed. Your browser may block clipboard access.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={checkPriceDrops}
              disabled={checking}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <Bell className="w-4 h-4" /> {checking ? "Checking…" : "Check prices"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setManageOpen((s) => !s)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Tag className="w-4 h-4" /> Collections
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 font-semibold text-white hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4" /> Discover more
          </Link>
        </div>
      </div>

      {banner && (
        <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800 flex items-center justify-between gap-3">
          <span>{banner}</span>
          <button type="button" className="font-semibold hover:underline" onClick={() => setBanner("")}>Dismiss</button>
        </div>
      )}

      {manageOpen && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">Collections</div>
              <div className="text-sm text-gray-600">Create collections and organize your wishlist.</div>
            </div>
            <button type="button" className="text-sm font-semibold text-gray-600 hover:text-gray-900" onClick={() => setManageOpen(false)}>Close</button>
          </div>
          <div className="mt-3 flex flex-col md:flex-row gap-3">
            <input
              className="h-11 rounded-xl border border-gray-300 px-3 flex-1"
              placeholder="New collection name…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const id = createCollection(e.currentTarget.value);
                  if (id) {
                    setBanner(`Created collection: ${e.currentTarget.value}`);
                    e.currentTarget.value = "";
                  }
                }
              }}
            />
            <button
              type="button"
              className="h-11 rounded-xl bg-gray-900 px-4 font-semibold text-white hover:bg-gray-800"
              onClick={(e) => {
                const input = e.currentTarget.parentElement.querySelector("input");
                const id = createCollection(input?.value);
                if (id) {
                  setBanner(`Created collection: ${input.value}`);
                  input.value = "";
                }
              }}
            >
              <Download className="w-4 h-4 inline-block mr-2" /> Add
            </button>
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {(collections || []).filter((c) => c.id !== "default").map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900">{c.name}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-sm font-semibold text-gray-600 hover:underline"
                      onClick={() => {
                        const n = window.prompt("Rename collection", c.name);
                        if (n) renameCollection(c.id, n);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-red-600 hover:underline"
                      onClick={() => deleteCollection(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {items.filter((i) => (i.collectionId || "default") === c.id).length} item(s)
                </div>
              </div>
            ))}
            {(collections || []).filter((c) => c.id !== "default").length === 0 && (
              <div className="text-sm text-gray-600">No collections yet. Create one above.</div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your wishlist…"
            className="w-full h-11 rounded-xl border border-gray-300 pl-10 pr-3"
          />
        </div>
        <label className="inline-flex items-center gap-2 h-11 rounded-xl border border-gray-300 px-3 bg-white">
          <Tag className="w-4 h-4 text-gray-500" />
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="bg-transparent outline-none text-sm font-semibold text-gray-700">
            <option value="all">All collections</option>
            <option value="default">All items</option>
            {(collections || []).filter((c) => c.id !== "default").map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 h-11 rounded-xl border border-gray-300 px-3 bg-white">
          <ArrowUpDown className="w-4 h-4 text-gray-500" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent outline-none text-sm font-semibold text-gray-700">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price: low → high</option>
            <option value="price_desc">Price: high → low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filtered.length}</span> item(s) · Total{" "}
          <span className="font-semibold text-gray-900">{money(totalCents, filtered[0]?.currency || "AUD")}</span>
          {drops.length > 0 && (
            <span className="ml-2 text-green-700 font-semibold">· {drops.length} price drop(s)</span>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white grid place-items-center border border-gray-200">
            <HeartOff className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Your wishlist is empty</h2>
          <p className="mt-2 text-gray-600 max-w-md mx-auto">
            Tap the heart icon on any product to save it here. We’ll keep your list even if you close the browser.
          </p>
          <Link
            to="/shop"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4" /> Browse Shop Handmade
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => {
            const key = it.listingId || it.slug;
            const productUrl = it.slug ? `/product/${it.slug}` : it.listingId ? `/product/${it.listingId}` : "/shop";
            const dropped = it.alertOnPriceDrop && it.lastKnownPriceCents != null && it.priceCents < it.lastKnownPriceCents;
            return (
              <div key={key} className="rounded-2xl border border-gray-200 bg-white p-4 hover:shadow-md transition">
                <div className="flex gap-4">
                  <Link to={productUrl} className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={it.imageUrl || PLACEHOLDER}
                      alt={it.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER; }}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={productUrl} className="font-semibold text-gray-900 hover:text-purple-700 line-clamp-2">
                      {it.title}
                    </Link>
                    {it.maker && <div className="text-xs text-gray-500 mt-0.5">by {it.maker}</div>}
                    <div className="mt-1 font-bold text-gray-900">{money(it.priceCents, it.currency)}</div>
                    {dropped && (
                      <div className="mt-1 text-xs font-semibold text-green-700">
                        Price dropped {money((it.lastKnownPriceCents || 0) - (it.priceCents || 0), it.currency)}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                        onClick={() => {
                          addItem({
                            listingId: it.listingId,
                            slug: it.slug,
                            title: it.title,
                            priceCents: it.priceCents,
                            quantity: 1,
                            imageUrl: it.imageUrl,
                            currency: it.currency,
                          });
                        }}
                      >
                        <ShoppingCart className="w-4 h-4" /> Move to cart
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => remove(key)}
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Collection</label>
                    <select
                      value={it.collectionId || "default"}
                      onChange={(e) => setCollectionForItem(key, e.target.value)}
                      className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm"
                    >
                      <option value="default">All items</option>
                      {(collections || []).filter((c) => c.id !== "default").map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Price-drop alert</label>
                    <button
                      type="button"
                      className={`w-full h-10 rounded-xl border px-3 text-sm font-semibold ${
                        it.alertOnPriceDrop ? "border-green-300 bg-green-50 text-green-800" : "border-gray-300 bg-white text-gray-700"
                      }`}
                      onClick={() => togglePriceAlert(key)}
                    >
                      {it.alertOnPriceDrop ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Note</label>
                  <textarea
                    value={it.note || ""}
                    onChange={(e) => updateNote(key, e.target.value)}
                    placeholder="E.g. gift idea, size, color preference…"
                    className="w-full min-h-[70px] rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    maxLength={240}
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">{(it.note || "").length}/240</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

