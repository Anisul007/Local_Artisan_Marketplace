import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Modal from "../../ux/Modal";
import { PublicListingsAPI } from "../../../lib/api";
import { useCart } from "../../../context/CartContext";

const PLACEHOLDER_IMG = "/images/placeholder.svg";
const FEATURED_LIMIT = 12;
const VISIBLE = 4;
const SLIDE_MS = 400;

function normalizeListing(p) {
  const img =
    p?.images?.find?.((i) => i?.isPrimary)?.url ||
    p?.images?.[0]?.url ||
    "";
  return {
    id: p._id?.toString?.() || p.id,
    slug: p.seo?.slug || p._id?.toString?.() || p.id,
    name: p.title || "Untitled",
    priceCents: p?.pricing?.priceCents ?? 0,
    currency: p?.pricing?.currency || "AUD",
    imageUrl: img || "",
    maker: p.vendor?.businessName || p.vendor?.displayName || "Artisan",
  };
}

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

export default function Featured() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const { addItem } = useCart();

  useEffect(() => {
    PublicListingsAPI.browse({ page: 1, sort: "newest" })
      .then((res) => {
        const data = res?.data?.data ?? res?.data ?? {};
        const raw = Array.isArray(data?.items) ? data.items : [];
        const list = raw
          .filter((p) => (p?.inventory?.status || "active") === "active")
          .slice(0, FEATURED_LIMIT)
          .map(normalizeListing);
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const maxIndex = Math.max(0, products.length - VISIBLE);
  const canGoPrev = index > 0;
  const canGoNext = index < maxIndex;

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(maxIndex, i + 1));

  const openQuickView = (p) => {
    setSel(p);
    setOpen(true);
  };

  const addToCartFromModal = () => {
    if (!sel) return;
    addItem({
      listingId: sel.id,
      slug: sel.slug,
      title: sel.name,
      priceCents: sel.priceCents,
      quantity: 1,
      imageUrl: sel.imageUrl,
      currency: sel.currency,
    });
    setOpen(false);
  };

  if (loading) {
    return (
      <section className="section">
        <div className="container">
          <h2 className="text-3xl font-bold mb-6">Featured Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border rounded-2xl overflow-hidden bg-white p-3 animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded-xl" />
                <div className="mt-3 h-5 bg-gray-200 rounded w-1/3" />
                <div className="mt-2 h-5 bg-gray-200 rounded w-2/3" />
                <div className="mt-3 h-10 bg-gray-200 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="section">
        <div className="container">
          <h2 className="text-3xl font-bold mb-6">Featured Products</h2>
          <p className="text-gray-600">No products yet. Check back soon or <Link to="/shop" className="text-orange-700 font-semibold hover:underline">browse the shop</Link>.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Featured Products</h2>
          <Link to="/shop" className="text-orange-700 font-semibold hover:underline">View all</Link>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous products"
            onClick={prev}
            disabled={!canGoPrev}
            className="shrink-0 z-10 w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            ‹
          </button>

          <div className="flex-1 min-w-0 overflow-hidden rounded-xl">
            <div
              className="flex gap-4"
              style={{
                transform: `translateX(calc(-1 * ${index} * (((100% - 3*1rem) / ${VISIBLE}) + 1rem)))`,
                transition: `transform ${SLIDE_MS}ms ease-out`,
              }}
            >
              {products.map((p, i) => (
                <div
                  key={p.id || i}
                  className="shrink-0 border rounded-2xl overflow-hidden bg-white p-3 hover:shadow-xl hover:-translate-y-1 transition"
                  style={{ flexBasis: `calc((100% - 3*1rem) / ${VISIBLE})` }}
                >
                <Link to={`/product/${p.slug}`} className="block">
                  <div className="aspect-[4/3] bg-gray-100 overflow-hidden rounded-xl">
                    <img
                      src={p.imageUrl || PLACEHOLDER_IMG}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG; }}
                    />
                  </div>
                  <div className="mt-3">
                    <div className="text-orange-700 font-bold">{money(p.priceCents, p.currency)}</div>
                    <div className="font-semibold line-clamp-2">{p.name}</div>
                    {p.maker && <div className="text-xs text-gray-500 mt-0.5">by {p.maker}</div>}
                  </div>
                </Link>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl border py-2 hover:bg-gray-50"
                  onClick={(e) => { e.preventDefault(); openQuickView(p); }}
                >
                  Quick view
                </button>
              </div>
            ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Next products"
            onClick={next}
            disabled={!canGoNext}
            className="shrink-0 z-10 w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            ›
          </button>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        {sel && (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img
                src={sel.imageUrl || PLACEHOLDER_IMG}
                alt={sel.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMG; }}
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">{sel.name}</h3>
              {sel.maker && <p className="text-sm text-gray-500">by {sel.maker}</p>}
              <div className="text-orange-700 font-bold mt-1">{money(sel.priceCents, sel.currency)}</div>
              <p className="mt-2 text-gray-600">Small-batch, slow-made by a local maker.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800"
                  onClick={addToCartFromModal}
                >
                  Add to cart
                </button>
                <Link
                  to={`/product/${sel.slug}`}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  View full details
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
