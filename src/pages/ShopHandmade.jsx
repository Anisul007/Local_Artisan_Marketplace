import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Grid3X3,
  Rows,
  Search,
  Star,
  Heart,
  ShoppingCart,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { CategoriesAPI, PublicListingsAPI } from "../lib/api";

/** ───────────────────────────────────────────────────────────────────────────
 * ShopHandmade.jsx — Browse marketplace (vendor-aware)
 * - Uses /api/categories and /api/listings (public) through your api.js
 * - Shows vendor name/logo on each item
 * - Filters to status=active (if drafts leak through)
 * - Handles multiple API shapes for { items, pagination, total }
 * ───────────────────────────────────────────────────────────────────────────*/

export default function ShopHandmade() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");
  const [view, setView] = useState("grid");

  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);

  const [min, setMin] = useState(0);
  const [max, setMax] = useState(500);
  const [rating, setRating] = useState(0);
  const [colors, setColors] = useState([]);
  const [tags, setTags] = useState([]);
  const [inStock, setInStock] = useState(true);
  const [freeShipping, setFreeShipping] = useState(false);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  // Optional brand color swatches in the sidebar
  const colorOptions = [
    "#7c3aed","#ef4444","#f59e0b","#10b981","#06b6d4",
    "#3b82f6","#a855f7","#f43f5e","#94a3b8","#0ea5e9",
  ];

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  // Reset results when filters change
  useEffect(() => {
    setItems([]);
    setPage(1);
    setNextPage(null);
  }, [
    search, sort, selectedCats.join(","), min, max, rating,
    colors.join(","), tags.join(","), inStock, freeShipping
  ]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { items: newItems, nextPage: np, total: t } = await fetchProducts({
        page,
        perPage: 24,
        search,
        sort,
        categories: selectedCats,
        min,
        max,
        rating,
        colors,
        tags,
        inStock,
        freeShipping,
      });
      if (!ignore) {
        setItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]));
        setNextPage(np);
        setTotal(t ?? 0);
        setFirstLoad(false);
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [
    page, search, sort, selectedCats.join(","), min, max, rating,
    colors.join(","), tags.join(","), inStock, freeShipping
  ]);

  // Infinite scroll sentinel
  const sentinelRef = useInfiniteScroll(() => {
    if (!loading && nextPage) setPage(nextPage);
  });

  const resetAll = () => {
    setSelectedCats([]);
    setSearch("");
    setMin(0);
    setMax(500);
    setRating(0);
    setColors([]);
    setTags([]);
    setInStock(true);
    setFreeShipping(false);
    setSort("popular");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-purple-600/10 via-pink-500/10 to-amber-400/10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-semibold">
            Shop Handmade
          </motion.h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Discover unique, small-batch pieces from Australian makers. Filter by
            category, price, and more—then sort by what matters to you.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <Panel title="Categories" defaultOpen>
            <div className="space-y-2 max-h-[38vh] overflow-auto pr-1">
              {categories.map((c) => (
                <label key={c.slug || c._id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-purple-600 bg-transparent"
                      checked={selectedCats.includes(c.slug)}
                      onChange={(e) =>
                        setSelectedCats((prev) =>
                          e.target.checked ? [...prev, c.slug] : prev.filter((x) => x !== c.slug)
                        )
                      }
                    />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="text-gray-500">{c.count ?? ""}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Price">
            <Range min={0} max={1000} step={5} value={[min, max]} onChange={([a,b]) => { setMin(a); setMax(b); }} />
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>${min}</span><span>to</span><span>${max}</span>
            </div>
          </Panel>

          <Panel title="Rating">
            <div className="flex items-center gap-2">
              {[5,4,3,2,1].map((r) => (
                <button
                  key={r}
                  onClick={() => setRating(r === rating ? 0 : r)}
                  className={`px-2 py-1 rounded-lg border ${
                    rating === r ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Star className={`w-4 h-4 ${rating === r ? "fill-white text-white" : "text-yellow-500"}`} />
                    <span className="text-sm">{r}+</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Colors">
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                  className={`w-6 h-6 rounded-full ring-2 ${colors.includes(c) ? "ring-purple-500" : "ring-gray-300"}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Tags">
            <div className="flex flex-wrap gap-2">
              {["handmade","recycled","eco","local","bespoke","limited"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    tags.includes(t) ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-700"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="More filters">
            <div className="space-y-2 text-sm text-gray-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-purple-600" checked={inStock} onChange={(e)=>setInStock(e.target.checked)} />
                In stock
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="accent-purple-600" checked={freeShipping} onChange={(e)=>setFreeShipping(e.target.checked)} />
                Free shipping
              </label>
            </div>
          </Panel>
        </aside>

        {/* Main */}
        <main className="col-span-12 lg:col-span-9">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 pl-9 text-gray-900 outline-none placeholder-gray-500 focus:ring-2 focus:ring-purple-300"
                  placeholder="Search crafts, makers, materials…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button onClick={resetAll} className="text-sm text-gray-600 hover:text-gray-900">Reset</button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-gray-600 sm:inline">Sort</span>
                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="appearance-none rounded-xl border border-gray-300 bg-white px-3 py-2 pl-9 pr-8 text-gray-900 focus:outline-none"
                  >
                    <option value="popular">Most popular</option>
                    <option value="new">Newest</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                    <option value="rating">Top rated</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>
              </div>

              <div className="hidden items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 sm:flex">
                <button
                  onClick={() => setView("grid")}
                  className={`rounded-lg p-2 ${view === "grid" ? "bg-purple-600 text-white" : "text-gray-700"}`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`rounded-lg p-2 ${view === "list" ? "bg-purple-600 text-white" : "text-gray-700"}`}
                  aria-label="List view"
                >
                  <Rows className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="mb-3 text-sm text-gray-600">
            {firstLoad ? "Loading…" : `${total.toLocaleString()} items`}
          </p>

          {/* Grid / list */}
          {view === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {loading && items.length === 0 && <SkeletonGrid />}
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {loading && items.length === 0 && <SkeletonList />}
              {items.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && items.length === 0 && !firstLoad && (
            <div className="py-20 text-center">
              <div className="text-2xl font-semibold">No products found</div>
              <p className="mt-2 text-gray-600">
                Try adjusting your filters or search terms.
              </p>
              <button
                onClick={resetAll}
                className="mt-4 rounded-xl bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Load more / sentinel */}
          <div ref={sentinelRef} className="h-10" />
          {loading && items.length > 0 && (
            <div className="flex items-center justify-center py-6 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading more
            </div>
          )}
        </main>
      </div>

      <div className="h-8" />
    </div>
  );
}

/* ───────────────────────────── UI helpers ───────────────────────────── */

function Panel({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3">
        <span className="font-medium text-gray-900">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Range({ min, max, step, value, onChange }) {
  const [a, b] = value;
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const onA = (e) => onChange([clamp(Math.min(+e.target.value, b - step)), b]);
  const onB = (e) => onChange([a, clamp(Math.max(+e.target.value, a + step))]);
  return (
    <div className="pt-1">
      <div className="relative h-8">
        <input type="range" min={min} max={max} step={step} value={a} onChange={onA} className="pointer-events-auto absolute inset-0 w-full appearance-none bg-transparent" />
        <input type="range" min={min} max={max} step={step} value={b} onChange={onB} className="pointer-events-auto absolute inset-0 w-full appearance-none bg-transparent" />
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gray-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-purple-600"
          style={{ left: `${((a - min) / (max - min)) * 100}%`, right: `${100 - ((b - min) / (max - min)) * 100}%` }}
        />
      </div>
      <style>{`
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:18px; height:18px; background:white; border-radius:9999px; border:none; box-shadow:0 0 0 3px rgba(124,58,237,0.25); cursor:pointer; }
        input[type=range]::-moz-range-thumb { width:18px; height:18px; background:white; border-radius:9999px; border:none; box-shadow:0 0 0 3px rgba(124,58,237,0.25); cursor:pointer; }
      `}</style>
    </div>
  );
}

function VendorChip({ name = "Unknown maker", logo }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
      <div className="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-gray-100">
        {logo ? <img src={logo} className="h-full w-full object-cover" /> : <span className="text-[10px] font-semibold">{(name || "?").slice(0,2).toUpperCase()}</span>}
      </div>
      <span className="truncate">by {name}</span>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <motion.article whileHover={{ y: -4 }} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.images?.[0]?.url || "/images/placeholder.png"}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1">
          {product.badges?.map((b, i) => (
            <span key={i} className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-semibold text-white">
              {b}
            </span>
          ))}
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
          <button className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700">
            <Heart className="h-4 w-4" />
          </button>
          <button className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700">
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 font-medium leading-tight">{product.name}</h3>
        <VendorChip name={product.maker} logo={product.vendorLogo} />
        <div className="mt-1 flex items-center gap-2 text-sm">
          <Price price={product.price} sale={product.salePrice} />
          <span className="text-gray-400">·</span>
          <Rating value={product.rating} count={product.reviewCount} />
        </div>
        {product.colors?.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {product.colors.slice(0, 5).map((c, i) => (
              <span key={i} className="h-3.5 w-3.5 rounded-full ring-2 ring-gray-300" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}

function ProductRow({ product }) {
  return (
    <motion.article whileHover={{ y: -2 }} className="group flex overflow-hidden rounded-2xl border border-gray-200 bg-white hover:shadow-md">
      <div className="relative aspect-square w-44 shrink-0 overflow-hidden">
        <img src={product.images?.[0]?.url || "/images/placeholder.png"} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
      </div>
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-medium leading-tight">{product.name}</h3>
            <VendorChip name={product.maker} logo={product.vendorLogo} />
            <div className="mt-2 text-sm">
              <Rating value={product.rating} count={product.reviewCount} />
            </div>
            {product.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {product.tags.slice(0, 4).map((t, i) => (
                  <span key={i} className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-700">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Price price={product.price} sale={product.salePrice} size="lg" />
            <div className="flex items-center gap-2">
              <button className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700">
                <Heart className="h-4 w-4" />
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 font-semibold text-white hover:bg-purple-700">
                <ShoppingCart className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Price({ price, sale, size = "base" }) {
  const cls = size === "lg" ? "text-xl" : "text-base";
  const fmt = (n) => (typeof n === "number" ? n.toFixed(2) : n);
  return (
    <div className={`flex items-center gap-2 font-semibold ${cls}`}>
      {sale ? (
        <>
          <span className="text-amber-600">${fmt(sale)}</span>
          <span className="font-normal text-gray-400 line-through">${fmt(price)}</span>
        </>
      ) : (
        <span>${fmt(price)}</span>
      )}
    </div>
  );
}

function Rating({ value = 0, count = 0 }) {
  const full = Math.round(value || 0);
  return (
    <div className="flex items-center gap-1 text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < full ? "fill-current" : "text-yellow-500/40"}`} />
      ))}
      <span className="text-xs text-gray-500">({count || 0})</span>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
      ))}
    </>
  );
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />
      ))}
    </>
  );
}

/* ───────────────────────────── data adapters ───────────────────────────── */

async function fetchCategories() {
  try {
    const r = await CategoriesAPI.all();
    // Accept: r.data, r.data.data, or []
    const raw = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
    // Expect each: { _id, name, slug, path }
    return raw.map((c) => ({
      _id: c._id,
      name: c.name || c.path || "",
      slug: c.slug || c.path || "",
      count: c.count,
    }));
  } catch {
    return [];
  }
}

async function fetchProducts(query) {
  // Map UI filters => API params
  const params = {
    q: query.search || "",
    category: (query.categories && query.categories[0]) || "",
    page: query.page || 1,
    min: query.min ? query.min * 100 : "",
    max: query.max ? query.max * 100 : "",
    // If your backend supports it, you can pass sort/status here
    // sort: query.sort,
    // status: "active",
  };

  const res = await PublicListingsAPI.browse(params).catch(() => ({ data: null }));
  const data =
    res?.data?.data ?? // {data:{items,pagination}} style
    res?.data ??        // {items,pagination} style
    {};

  const rawItems = Array.isArray(data?.items) ? data.items
                  : Array.isArray(res?.data) ? res.data
                  : [];

  // Normalize listings → product cards, include VENDOR info
  const list = rawItems
    // Keep only active if the backend returns mixed statuses
    .filter((p) => (p?.inventory?.status || "active") === "active")
    .map((p) => {
      const img =
        p?.images?.find?.((i) => i?.isPrimary)?.url ||
        p?.images?.[0]?.url ||
        "";

      return {
        id: p._id || p.id || p.seo?.slug || Math.random().toString(36).slice(2),
        name: p.title || "Untitled",
        price: (p?.pricing?.priceCents || 0) / 100,
        salePrice: null, // adapt if you add promos
        rating: p.ratingAvg || 0,
        reviewCount: p.ratingsCount || 0,
        images: img ? [{ url: img }] : [],
        badges: p.inventory?.status === "out_of_stock" ? ["Out of stock"] : [],
        maker: p.vendor?.businessName || p.vendor?.displayName || p.vendor?.name || "Unknown maker",
        vendorLogo: p.vendor?.logoUrl || p.vendor?.avatarUrl || "",
        tags: p.tags || [],
        colors: p.colors || [],
      };
    });

  // Pagination: support {pagination:{page,pages,total}} and {total}
  const total =
    data?.pagination?.total ??
    data?.total ??
    list.length;

  const perPage = query.perPage || 24;
  const currentPage = data?.pagination?.page || params.page;
  const pages = data?.pagination?.pages || Math.ceil(total / perPage);
  const nextPage = currentPage < pages ? currentPage + 1 : null;

  return { items: list, nextPage, total };
}

/* ───────────────────────────── hooks ───────────────────────────── */

function useInfiniteScroll(onReachEnd) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && onReachEnd?.()),
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onReachEnd]);
  return ref;
}



