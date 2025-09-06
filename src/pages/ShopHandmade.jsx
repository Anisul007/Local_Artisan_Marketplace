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

/**
 * ShopHandmade.jsx — Interactive Shop / Browse page (light + purple brand theme)
 *
 * ✦ Features
 *   • Left sidebar with categories, price, rating, color, tags, stock, shipping
 *   • Sorting + search + view toggles
 *   • Debounced filters & infinite scroll with skeletons
 *   • Vibrant product cards with hover effects (no hardcoded items)
 *
 * 🔌 Integration
 *   Replace `fetchCategories` and `fetchProducts` with your API.
 *   Expected endpoints (example only):
 *     GET /api/categories?includeCounts=true
 *     GET /api/products?search=&categories=ceramics,textiles&sort=price-asc&page=1&perPage=24&min=0&max=500&rating=4&inStock=true&freeShipping=false&colors=red,blue&tags=handmade,recycled
 */

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

  // Colors to show as swatches
  const colorOptions = [
    "#7c3aed", // purple
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // emerald
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#a855f7", // violet
    "#f43f5e", // pink
    "#94a3b8", // slate
    "#0ea5e9", // sky
  ];

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  // Reset when filters change
  useEffect(() => {
    setItems([]);
    setPage(1);
    setNextPage(null);
  }, [search, sort, selectedCats.join(","), min, max, rating, colors.join(","), tags.join(","), inStock, freeShipping]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
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
    };
    run();
    return () => (ignore = true);
  }, [page, search, sort, selectedCats.join(","), min, max, rating, colors.join(","), tags.join(","), inStock, freeShipping]);

  // Infinite scroll sentinel
  const sentinelRef = useInfiniteScroll(() => {
    if (!loading && nextPage) setPage(nextPage);
  });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-purple-600/10 via-pink-500/10 to-amber-400/10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-semibold">
            Shop Handmade
          </motion.h1>
          <p className="text-gray-600 mt-2 max-w-2xl">Discover unique, small‑batch pieces from Australian makers. Filter by category, color, and more—then sort by what matters to you.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <Panel title="Categories" defaultOpen>
            <div className="space-y-2 max-h-[38vh] overflow-auto pr-1">
              {categories.map((c) => (
                <label key={c.slug} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-purple-600 bg-transparent"
                      checked={selectedCats.includes(c.slug)}
                      onChange={(e) =>
                        setSelectedCats((prev) => (e.target.checked ? [...prev, c.slug] : prev.filter((x) => x !== c.slug)))
                      }
                    />
                    <span>{c.name}</span>
                  </div>
                  <span className="text-gray-500">{c.count ?? ""}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Price">
            <Range min={0} max={1000} step={5} value={[min, max]} onChange={([a, b]) => { setMin(a); setMax(b); }} />
            <div className="flex items-center justify-between text-sm mt-2 text-gray-600">
              <span>${min}</span>
              <span>to</span>
              <span>${max}</span>
            </div>
          </Panel>

          <Panel title="Rating">
            <div className="flex items-center gap-2">
              {[5,4,3,2,1].map((r) => (
                <button key={r} onClick={() => setRating(r === rating ? 0 : r)} className={`px-2 py-1 rounded-lg border ${rating === r ? "bg-purple-600 text-white border-purple-600" : "border-gray-300 text-gray-700"}`}>
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
                  onClick={() =>
                    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
                  }
                  className={`w-6 h-6 rounded-full ring-2 ${colors.includes(c) ? "ring-purple-500" : "ring-gray-300"}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Tags">
            <div className="flex flex-wrap gap-2">
              {['handmade','recycled','eco','local','bespoke','limited'].map((t) => (
                <button key={t} onClick={() => setTags((prev)=> prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t])} className={`text-xs px-2.5 py-1 rounded-full border ${tags.includes(t) ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300 text-gray-700'}`}>
                  #{t}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="More filters">
            <div className="space-y-2 text-sm text-gray-700">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-purple-600" checked={inStock} onChange={(e)=>setInStock(e.target.checked)} /> In stock</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-purple-600" checked={freeShipping} onChange={(e)=>setFreeShipping(e.target.checked)} /> Free shipping</label>
            </div>
          </Panel>
        </aside>

        {/* Main */}
        <main className="col-span-12 lg:col-span-9">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="pl-9 pr-3 py-2 rounded-xl bg-white border border-gray-300 placeholder-gray-500 text-gray-900 outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Search crafts, makers, materials…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button onClick={() => { setSelectedCats([]); setSearch(""); setMin(0); setMax(500); setRating(0); setColors([]); setTags([]); setInStock(true); setFreeShipping(false); setSort("popular"); }} className="text-sm text-gray-600 hover:text-gray-900">Reset</button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-sm text-gray-600">Sort</span>
                <div className="relative">
                  <ArrowUpDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select value={sort} onChange={(e)=>setSort(e.target.value)} className="appearance-none pl-9 pr-8 py-2 rounded-xl bg-white border border-gray-300 text-gray-900 focus:outline-none">
                    <option value="popular">Most popular</option>
                    <option value="new">Newest</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                    <option value="rating">Top rated</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1 rounded-xl bg-gray-100 border border-gray-200 p-1">
                <button onClick={()=>setView("grid")} className={`p-2 rounded-lg ${view==='grid' ? 'bg-purple-600 text-white' : 'text-gray-700'}`} aria-label="Grid view">
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={()=>setView("list")} className={`p-2 rounded-lg ${view==='list' ? 'bg-purple-600 text-white' : 'text-gray-700'}`} aria-label="List view">
                  <Rows className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-600 mb-3">{firstLoad ? "Loading…" : `${total.toLocaleString()} items`}</p>

          {/* Grid / list */}
          {view === 'grid' ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
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
            <div className="text-center py-20">
              <div className="text-2xl font-semibold">No products found</div>
              <p className="text-gray-600 mt-2">Try adjusting your filters or search terms.</p>
              <button onClick={() => { setSelectedCats([]); setSearch(""); setMin(0); setMax(500); setRating(0); setColors([]); setTags([]); setInStock(true); setFreeShipping(false); }} className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700">Clear filters</button>
            </div>
          )}

          {/* Load more / sentinel */}
          <div ref={sentinelRef} className="h-10" />
          {loading && items.length > 0 && (
            <div className="flex items-center justify-center py-6 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading more
            </div>
          )}
        </main>
      </div>

      <div className="h-8" />
    </div>
  );
}

// -------------------- UI Components -------------------- //

function Panel({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-gray-900">{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
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
        <input type="range" min={min} max={max} step={step} value={a} onChange={onA} className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto" />
        <input type="range" min={min} max={max} step={step} value={b} onChange={onB} className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto" />
        {/* Track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-gray-200 rounded-full" />
        {/* Active segment */}
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-purple-600 rounded-full" style={{ left: `${((a - min) / (max - min)) * 100}%`, right: `${100 - ((b - min) / (max - min)) * 100}%` }} />
      </div>
      <style>{`
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:18px; height:18px; background:white; border-radius:9999px; border:none; box-shadow:0 0 0 3px rgba(124,58,237,0.25); cursor:pointer; }
        input[type=range]::-moz-range-thumb { width:18px; height:18px; background:white; border-radius:9999px; border:none; box-shadow:0 0 0 3px rgba(124,58,237,0.25); cursor:pointer; }
      `}</style>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <motion.article whileHover={{ y: -4 }} className="group rounded-2xl border border-gray-200 overflow-hidden bg-white hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden">
        <img src={product.images?.[0]?.url || "/images/placeholder.png"} alt={product.name} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition" />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {product.badges?.map((b, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-purple-600 text-white font-semibold">{b}</span>
          ))}
        </div>
        {/* Quick actions */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
          <button className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Heart className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"><ShoppingCart className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium leading-tight line-clamp-2">{product.name}</h3>
          {product.salePrice && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-300 text-gray-900 font-semibold">Sale</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <Price price={product.price} sale={product.salePrice} />
          <span className="text-gray-400">·</span>
          <Rating value={product.rating} count={product.reviewCount} />
        </div>
        {product.colors?.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            {product.colors.slice(0, 5).map((c, i) => (
              <span key={i} className="w-3.5 h-3.5 rounded-full ring-2 ring-gray-300" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}

function ProductRow({ product }) {
  return (
    <motion.article whileHover={{ y: -2 }} className="group rounded-2xl border border-gray-200 overflow-hidden bg-white flex hover:shadow-md">
      <div className="relative w-44 shrink-0 aspect-square overflow-hidden">
        <img src={product.images?.[0]?.url || "/images/placeholder.png"} alt={product.name} className="w-full h-full object-cover transition group-hover:scale-105" />
      </div>
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-lg leading-tight">{product.name}</h3>
            <div className="mt-1 text-sm text-gray-600">by {product.maker || "Unknown maker"}</div>
            <div className="mt-2 text-sm"><Rating value={product.rating} count={product.reviewCount} /></div>
            {product.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">{product.tags.slice(0,4).map((t,i)=>(<span key={i} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">#{t}</span>))}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Price price={product.price} sale={product.salePrice} size="lg" />
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Heart className="w-4 h-4" /></button>
              <button className="px-3 py-2 rounded-lg bg-purple-600 text-white font-semibold flex items-center gap-2 hover:bg-purple-700"><ShoppingCart className="w-4 h-4" /> Add</button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Price({ price, sale, size = "base" }) {
  const cls = size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <div className={`flex items-center gap-2 font-semibold ${cls}`}>
      {sale ? (
        <>
          <span className="text-amber-600">${sale.toFixed ? sale.toFixed(2) : sale}</span>
          <span className="text-gray-400 line-through font-normal">${price.toFixed ? price.toFixed(2) : price}</span>
        </>
      ) : (
        <span>${price?.toFixed ? price.toFixed(2) : price}</span>
      )}
    </div>
  );
}

function Rating({ value = 0, count = 0 }) {
  const full = Math.round(value || 0);
  return (
    <div className="flex items-center gap-1 text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < full ? 'fill-current' : 'text-yellow-500/40'}`} />
      ))}
      <span className="text-xs text-gray-500">({count || 0})</span>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-gray-100 aspect-square animate-pulse" />
      ))}
    </>
  );
}

function SkeletonList() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 rounded-2xl border border-gray-200 bg-gray-100 animate-pulse" />
      ))}
    </>
  );
}

// -------------------- Data adapters (replace with real API) -------------------- //

async function fetchCategories() {
  try {
    const res = await fetch("/api/categories?includeCounts=true");
    if (!res.ok) throw new Error("fail");
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchProducts(query) {
  const params = new URLSearchParams();
  params.set("page", query.page);
  params.set("perPage", query.perPage || 24);
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  if (query.categories?.length) params.set("categories", query.categories.join(","));
  if (query.min != null) params.set("min", String(query.min));
  if (query.max != null) params.set("max", String(query.max));
  if (query.rating) params.set("rating", String(query.rating));
  if (query.colors?.length) params.set("colors", query.colors.join(","));
  if (query.tags?.length) params.set("tags", query.tags.join(","));
  if (query.inStock != null) params.set("inStock", String(query.inStock));
  if (query.freeShipping != null) params.set("freeShipping", String(query.freeShipping));

  try {
    const res = await fetch(`/api/products?${params.toString()}`);
    if (!res.ok) throw new Error("fail");
    return await res.json();
  } catch {
    return { items: [], nextPage: null, total: 0 };
  }
}

// -------------------- Hooks -------------------- //

function useInfiniteScroll(onReachEnd) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) onReachEnd?.();
      });
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onReachEnd]);
  return ref;
}


