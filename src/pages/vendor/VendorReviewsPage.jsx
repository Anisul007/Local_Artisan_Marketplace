import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";

export default function VendorReviewsPage() {
  const [items, setItems] = useState([]);
  const [rating, setRating] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await apiGet(`/api/vendor/reviews?rating=${rating}`);
      setItems(r.data?.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [rating]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Product Reviews</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">Filter rating:</label>
          <select value={rating} onChange={(e) => setRating(e.target.value)} className="border rounded px-3 py-2">
            <option value="">All</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}★
              </option>
            ))}
          </select>
          <button onClick={load} className="rounded border px-3 py-2">
            Refresh
          </button>
        </div>
      </div>

      {err && <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : !items.length ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-gray-600">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="bg-white border rounded-xl p-4">
              <div className="font-medium">{it.rating}★</div>
              <div className="text-gray-700 whitespace-pre-wrap">{it.comment || "—"}</div>
              <div className="text-xs text-gray-500 mt-1">
                {it.createdAt ? new Date(it.createdAt).toLocaleString() : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

