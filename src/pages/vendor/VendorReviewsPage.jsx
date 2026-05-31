import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReviewsAPI } from "../../lib/api";

function Stars({ rating }) {
  return (
    <span className="inline-flex text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "text-amber-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function VendorReviewsPage() {
  const [items, setItems] = useState([]);
  const [rating, setRating] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await ReviewsAPI.listMine({ rating, page: 1, limit: 50 });
      if (!r?.ok) throw new Error(r?.data?.message || "Failed to load reviews");
      setItems(r?.data?.data?.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load reviews");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rating]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">Reviews customers leave on your listings.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filter rating:</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}★
              </option>
            ))}
          </select>
          <button type="button" onClick={load} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}

      {loading ? (
        <div className="text-sm text-gray-500">Loading reviews…</div>
      ) : !items.length ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
          No reviews yet. When customers review your products, they&apos;ll appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <article key={it._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Stars rating={it.rating} />
                    {it.verifiedPurchase && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Verified purchase
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {it.productTitle || "Product"}
                    {it.productSlug ? (
                      <Link
                        to={`/product/${it.productSlug}`}
                        className="ml-2 text-xs font-normal text-purple-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View listing
                      </Link>
                    ) : null}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {it.createdAt ? new Date(it.createdAt).toLocaleString() : "—"}
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{it.comment || "No written comment."}</p>
              <p className="mt-2 text-xs text-gray-500">By {it.customerName || "Customer"}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
