import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Star, Heart, ShoppingCart, ArrowLeft, Store, Globe, Check } from "lucide-react";
import { PublicListingsAPI, CustomerReviewsAPI } from "../lib/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";

function money(cents, cur = "AUD") {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(cents / 100);
}

export default function Product() {
  const { slug } = useParams();
  const { addItem, items } = useCart();
  const { toggle: toggleWishlist, has: hasWishlist } = useWishlist();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (!slug) return;
    PublicListingsAPI.bySlug(slug)
      .then((r) => {
        const data = r?.data?.data ?? r?.data;
        if (data && (data.title || data._id)) setItem(data);
        else setErr("Product not found");
      })
      .catch((e) => setErr(e?.message || "Not found"));
  }, [slug]);

  useEffect(() => {
    if (!item?._id) return;
    CustomerReviewsAPI.list(item._id)
      .then((r) => {
        const data = r?.data?.data ?? r?.data;
        if (r?.ok && Array.isArray(data?.items)) setReviews(data.items);
      })
      .catch(() => {});
  }, [item?._id]);

  const cartEntry = item?._id
    ? items?.find((i) => i.listingId === item._id || (item?.seo?.slug && i.slug === item?.seo?.slug))
    : null;
  const cartQty = Number(cartEntry?.quantity || 0);
  const inCart = cartQty > 0;

  async function handleSubmitReview(e) {
    e.preventDefault();
    setReviewError("");
    setReviewSubmitting(true);
    try {
      const r = await CustomerReviewsAPI.create({
        productId: item._id,
        listingId: item._id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      if (r?.ok) {
        setReviewComment("");
        setReviewRating(5);
        const listRes = await CustomerReviewsAPI.list(item._id);
        const listData = listRes?.data?.data ?? listRes?.data;
        if (listRes?.ok && Array.isArray(listData?.items)) setReviews(listData.items);
      } else {
        setReviewError(r?.data?.message || "Could not submit review.");
      }
    } catch (e) {
      setReviewError(e?.message || "Could not submit review.");
    }
    setReviewSubmitting(false);
  }

  if (err) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">{err}</p>
        <Link to="/shop" className="inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to shop
        </Link>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="animate-pulse rounded-xl bg-gray-200 h-64 w-full max-w-2xl" />
      </div>
    );
  }

  const images = item.images?.length ? item.images : (item.images?.[0]?.url ? [item.images[0]] : []);
  const primaryImg = images.find((i) => i.isPrimary) || images[0];
  const currentImage = images[selectedImageIndex] || primaryImg;
  const vendor = item.vendor || {};
  const makerName = vendor.businessName || vendor.displayName || vendor.name || "Artisan";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to shop
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm">
              {currentImage?.url ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt || item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/placeholder.svg"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      selectedImageIndex === i ? "border-purple-600 ring-2 ring-purple-200" : "border-gray-200"
                    }`}
                  >
                    <img src={img.url} alt={img.alt || ""} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
            <div className="flex items-center gap-3 text-lg mb-4">
              <span className="font-semibold text-gray-900">{money(item.pricing?.priceCents, item.pricing?.currency)}</span>
              {item.pricing?.compareAtCents > 0 && (
                <span className="text-gray-500 line-through">
                  {money(item.pricing.compareAtCents, item.pricing?.currency)}
                </span>
              )}
            </div>

            {/* Vendor block */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {vendor.logoUrl || vendor.avatarUrl ? (
                  <img src={vendor.logoUrl || vendor.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/placeholder.svg"; }} />
                ) : (
                  <Store className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Sold by</p>
                <p className="font-semibold text-gray-900 truncate">{makerName}</p>
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" /> Visit shop
                  </a>
                )}
              </div>
            </div>

            {/* Rating */}
            {(item.ratingAvg > 0 || item.ratingsCount > 0) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i <= (item.ratingAvg || 0) ? "fill-current" : "text-amber-200"}`}
                    />
                  ))}
                </div>
                <span>({item.ratingsCount || 0} reviews)</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                type="button"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition ${
                  inCart ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700"
                }`}
                onClick={() =>
                  addItem({
                    listingId: item._id,
                    slug: item.seo?.slug,
                    title: item.title,
                    priceCents: item.pricing?.priceCents || 0,
                    quantity: 1,
                    imageUrl: currentImage?.url || item.images?.[0]?.url || "",
                    currency: item.pricing?.currency || "AUD",
                  })
                }
              >
                {inCart ? <Check className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                {inCart ? `Added to cart${cartQty > 1 ? ` (${cartQty})` : ""}` : "Add to cart"}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                aria-label="Wishlist"
                onClick={() =>
                  toggleWishlist({
                    listingId: item._id,
                    slug: item.seo?.slug,
                    title: item.title,
                    priceCents: item.pricing?.priceCents || 0,
                    currency: item.pricing?.currency || "AUD",
                    imageUrl: currentImage?.url || item.images?.[0]?.url || "",
                    maker: makerName,
                  })
                }
              >
                <Heart className={`w-5 h-5 ${hasWishlist(item._id) || hasWishlist(item.seo?.slug) ? "fill-current text-purple-600" : ""}`} />
              </button>
            </div>

            {/* Stock */}
            {item.inventory != null && (
              <p className="text-sm text-gray-600 mb-6">
                {item.inventory.stockQty > 0 ? (
                  <span className="text-green-700">In stock ({item.inventory.stockQty} available)</span>
                ) : (
                  <span className="text-amber-700">Out of stock</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Full description */}
        <section className="mt-10 md:mt-14 p-6 md:p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{item.description}</p>
          </div>
        </section>

        {/* Vendor bio (if present) */}
        {vendor.bio && (
          <section className="mt-8 p-6 md:p-8 rounded-2xl bg-white border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">About {makerName}</h2>
            <p className="text-gray-700 leading-relaxed">{vendor.bio}</p>
            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-purple-600 font-medium hover:underline"
              >
                <Globe className="w-4 h-4" /> Visit website
              </a>
            )}
          </section>
        )}

        {/* Reviews */}
        <section className="mt-8 p-6 md:p-8 rounded-2xl bg-white border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews</h2>
          {reviews.length > 0 && (
            <div className="space-y-4 mb-6">
              {reviews.map((r, i) => (
                <div key={i} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex text-amber-500">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-4 h-4 ${n <= (r.rating || 0) ? "fill-current" : "text-amber-200"}`} />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">{r.customerName || "Customer"}</span>
                    {r.verifiedPurchase && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified purchase</span>
                    )}
                  </div>
                  {r.comment && <p className="text-gray-700 text-sm">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
          {user ? (
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Leave a review</p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Rating:</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <textarea
                placeholder="Your review (optional)"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
                maxLength={2000}
              />
              {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-70"
              >
                {reviewSubmitting ? "Submitting…" : "Submit review"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              <Link to="/login" className="text-purple-600 font-medium hover:underline">Log in</Link> to leave a review.
            </p>
          )}
        </section>

        {/* Meta (SEO) */}
        {item.seo?.metaDescription && (
          <p className="mt-6 text-sm text-gray-500 max-w-2xl">{item.seo.metaDescription}</p>
        )}
      </div>
    </div>
  );
}
