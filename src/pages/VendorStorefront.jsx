import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PublicListingsAPI, PublicVendorsAPI } from "../lib/api";

const PLACEHOLDER = "/images/placeholder.svg";

function money(cents, currency = "AUD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

export default function VendorStorefront() {
  const { vendorId } = useParams();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "products"; // products | reviews | about

  const [vendor, setVendor] = useState(null);
  const [vendorErr, setVendorErr] = useState("");

  const [products, setProducts] = useState([]);
  const [productsErr, setProductsErr] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [reviews, setReviews] = useState([]);
  const [reviewsErr, setReviewsErr] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [saleOnly, setSaleOnly] = useState(false);

  useEffect(() => {
    if (!vendorId) return;
    setVendorErr("");
    PublicVendorsAPI.get(vendorId)
      .then((r) => {
        if (r?.ok && r?.data?.data) setVendor(r.data.data);
        else setVendorErr(r?.data?.message || "Vendor not found");
      })
      .catch((e) => setVendorErr(e?.message || "Vendor not found"));
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) return;
    setLoadingProducts(true);
    setProductsErr("");
    PublicListingsAPI.browse({ page: 1, sort, q, vendor: vendorId })
      .then((r) => {
        const data = r?.data?.data ?? r?.data ?? {};
        const raw = Array.isArray(data?.items) ? data.items : [];
        const list = raw.map((p) => {
          const img = p?.images?.find?.((i) => i?.isPrimary)?.url || p?.images?.[0]?.url || "";
          return {
            id: p._id || p.id,
            slug: p.seo?.slug || p._id || p.id,
            title: p.title || "Untitled",
            priceCents: p?.pricing?.priceCents || 0,
            compareAtCents: p?.pricing?.compareAtCents || 0,
            currency: p?.pricing?.currency || "AUD",
            imageUrl: img,
          };
        });
        setProducts(saleOnly ? list.filter((p) => p.compareAtCents > p.priceCents) : list);
      })
      .catch(() => setProductsErr("Could not load products"))
      .finally(() => setLoadingProducts(false));
  }, [vendorId, sort, q, saleOnly]);

  useEffect(() => {
    if (!vendorId) return;
    if (tab !== "reviews") return;
    setLoadingReviews(true);
    setReviewsErr("");
    PublicVendorsAPI.reviews(vendorId, { page: 1, limit: 20 })
      .then((r) => {
        const data = r?.data?.data ?? r?.data ?? {};
        const items = Array.isArray(data?.items) ? data.items : [];
        setReviews(items);
      })
      .catch(() => setReviewsErr("Could not load reviews"))
      .finally(() => setLoadingReviews(false));
  }, [vendorId, tab]);

  const businessName = vendor?.businessName || "Vendor";
  const categories = useMemo(() => vendor?.primaryCategories || [], [vendor?.primaryCategories]);

  const setTab = (next) => {
    const n = new URLSearchParams(sp);
    n.set("tab", next);
    setSp(n, { replace: true });
  };

  if (vendorErr) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-red-600">{vendorErr}</p>
        <Link to="/shop" className="text-purple-600 font-semibold hover:underline">
          Back to shop
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
            <img
              src={vendor?.logoUrl || PLACEHOLDER}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = PLACEHOLDER;
              }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{businessName}</h1>
            <p className="text-gray-600 mt-1">{vendor?.bio || "Handmade goods from a local maker."}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {categories.slice(0, 6).map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
              {vendor?.address?.city && (
                <Badge>
                  {vendor.address.city}
                  {vendor.address.state ? `, ${vendor.address.state}` : ""}
                </Badge>
              )}
              {vendor?.stats?.products != null && <Badge>{vendor.stats.products} products</Badge>}
              {vendor?.website && (
                <a className="text-sm font-semibold text-purple-600 hover:underline" href={vendor.website} target="_blank" rel="noreferrer">
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2 border-b border-gray-200">
          {[
            { id: "products", label: "Products" },
            { id: "reviews", label: "Reviews" },
            { id: "about", label: "About" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 -mb-px border-b-2 font-semibold ${
                tab === t.id ? "border-purple-600 text-purple-700" : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "products" && (
        <section className="mt-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Search products</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-300 px-3"
                placeholder="Search within this shop…"
              />
            </div>
            <div className="flex gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sort</label>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-xl border border-gray-300 px-3">
                  <option value="newest">Newest</option>
                  <option value="popular">Popular</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <label className="flex items-center gap-2 h-11 mt-6 md:mt-0 px-3 rounded-xl border border-gray-300 bg-white">
                <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} />
                <span className="text-sm font-semibold text-gray-700">On sale</span>
              </label>
            </div>
          </div>

          {productsErr && <p className="mt-4 text-red-600">{productsErr}</p>}

          {loadingProducts ? (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-3 animate-pulse">
                  <div className="aspect-square rounded-xl bg-gray-200" />
                  <div className="mt-3 h-4 bg-gray-200 rounded w-2/3" />
                  <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((p) => (
                <Link key={p.id} to={`/product/${p.slug}`} className="block rounded-2xl border border-gray-200 bg-white p-3 hover:shadow-md transition">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={p.imageUrl || PLACEHOLDER}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = PLACEHOLDER;
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-bold text-gray-900">{money(p.priceCents, p.currency)}</div>
                    {p.compareAtCents > p.priceCents && <div className="text-xs text-orange-700 font-semibold">On sale</div>}
                    <div className="mt-1 text-sm font-semibold line-clamp-2 text-gray-900">{p.title}</div>
                  </div>
                </Link>
              ))}
              {products.length === 0 && <div className="col-span-2 md:col-span-4 text-gray-600">No products found.</div>}
            </div>
          )}
        </section>
      )}

      {tab === "reviews" && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          {reviewsErr && <p className="text-red-600">{reviewsErr}</p>}
          {loadingReviews ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-gray-600">No reviews yet.</p>
          ) : (
            <div className="space-y-5">
              {reviews.map((r) => (
                <div key={r._id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{r.customerName}</div>
                    <div className="text-xs text-gray-500">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</div>
                  </div>
                  <div className="mt-1 text-sm text-gray-700">
                    <span className="font-semibold">{r.rating}/5</span>
                    {r.verifiedPurchase && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Verified purchase</span>}
                  </div>
                  {r.comment && <p className="mt-2 text-sm text-gray-700">{r.comment}</p>}
                  {r.productSlug && (
                    <Link to={`/product/${r.productSlug}`} className="mt-2 inline-block text-sm text-purple-600 font-semibold hover:underline">
                      View {r.productTitle}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "about" && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">About {businessName}</h2>
          <p className="mt-2 text-gray-700 whitespace-pre-wrap">{vendor?.bio || "—"}</p>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Contact</div>
              {vendor?.contactEmail && <div className="text-sm text-gray-700 mt-1">{vendor.contactEmail}</div>}
              {vendor?.phone && <div className="text-sm text-gray-700 mt-1">{vendor.phone}</div>}
              {vendor?.website && (
                <a className="text-sm text-purple-600 font-semibold hover:underline mt-2 inline-block" href={vendor.website} target="_blank" rel="noreferrer">
                  {vendor.website}
                </a>
              )}
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Location</div>
              <div className="text-sm text-gray-700 mt-1">
                {[
                  vendor?.address?.line1,
                  vendor?.address?.city,
                  vendor?.address?.state,
                  vendor?.address?.postcode,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </div>
              <div className="text-sm text-gray-700 mt-1">{vendor?.address?.country || "AU"}</div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
