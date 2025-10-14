// src/pages/vendor/ListingPreviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ListingsAPI } from "../../lib/api";

const money = (cents, cur = "AUD") =>
  typeof cents === "number"
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(cents / 100)
    : "—";

function Check({ ok, label, hint }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-1 h-4 w-4 rounded-full border ${
          ok ? "bg-emerald-500 border-emerald-500" : "bg-gray-100 border-gray-300"
        }`}
      />
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {hint && <div className="text-xs text-gray-500">{hint}</div>}
      </div>
    </div>
  );
}

export default function ListingPreviewPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = await ListingsAPI.read(id).catch(() => ({ data: null }));
      if (!cancelled) {
        setItem(r?.data?.data ?? r?.data ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const primaryUrl = useMemo(
    () => (item?.images || []).find((i) => i?.isPrimary)?.url || item?.images?.[0]?.url || "",
    [item]
  );

  // “Ready to publish” rules must match the backend guard
  const checks = useMemo(() => {
    const price = Number(item?.pricing?.priceCents || 0);
    const hasTitle = !!item?.title?.trim();
    const hasDesc = !!item?.description?.trim();
    const hasPrice = price > 0;
    const hasPrimaryImg = !!primaryUrl;
    const hasCategory = !!item?.primaryCategory || (Array.isArray(item?.categories) && item.categories.length > 0);
    return { hasTitle, hasDesc, hasPrice, hasPrimaryImg, hasCategory };
  }, [item, primaryUrl]);

  const canPublish = Object.values(checks).every(Boolean) && item?.inventory?.status !== "active";

  const publish = async () => {
    setPublishing(true);
    try {
      const r = await ListingsAPI.publish(id);
      if (!r?.ok) throw new Error(r?.data?.message || "Publish failed");
      const updated = r?.data?.data ?? r?.data ?? null;
      if (updated) setItem(updated);
      setFlash("Your listing is live and now visible to customers.");
      // Optional: bounce to My Listings after a short pause with a flash message
      setTimeout(() => {
        nav("/vendor/listings", {
          replace: true,
          state: { flash: { type: "success", message: "Listing published successfully." } },
        });
      }, 1200);
    } catch (e) {
      setFlash(e.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!item) return <div className="p-6 text-red-600">Listing not found.</div>;

  return (
    <div className="p-6 mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Preview</h1>
          <p className="text-sm text-gray-600">Check the details below before publishing.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/vendor/listings/${id}/edit`}
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Edit listing
          </Link>
          <button
            onClick={publish}
            disabled={!canPublish || publishing}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              canPublish ? "bg-emerald-600 hover:bg-emerald-500" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {publishing ? "Publishing…" : item?.inventory?.status === "active" ? "Published" : "Publish"}
          </button>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            flash.toLowerCase().includes("live") || flash.toLowerCase().includes("success")
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {flash}
        </div>
      )}

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Preview card */}
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          {primaryUrl ? (
            <img
              src={primaryUrl}
              alt={item.title}
              className="h-64 w-full object-cover md:h-72"
            />
          ) : (
            <div className="grid h-64 w-full place-items-center bg-gray-100 text-gray-400 md:h-72">
              No image
            </div>
          )}
          <div className="p-4">
            <div className="text-xl font-bold text-gray-900">{item.title || "Untitled"}</div>
            <div className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {item.description || "—"}
            </div>
            <div className="mt-3 text-base font-semibold">
              Price: {money(item?.pricing?.priceCents, item?.pricing?.currency)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Status: <span className="font-medium">{item?.inventory?.status || "draft"}</span>
            </div>
          </div>
        </div>

        {/* Right: Publish checklist */}
        <div className="rounded-2xl border p-5">
          <div className="mb-3 text-lg font-bold text-gray-900">Ready to publish?</div>
          <div className="space-y-3">
            <Check ok={checks.hasTitle} label="Title" hint={!checks.hasTitle && "Add a clear, descriptive title."} />
            <Check
              ok={checks.hasDesc}
              label="Description"
              hint={!checks.hasDesc && "Describe materials, size, and what makes it special."}
            />
            <Check
              ok={checks.hasPrice}
              label="Price"
              hint={!checks.hasPrice && "Set a price greater than A$0.00."}
            />
            <Check
              ok={checks.hasPrimaryImg}
              label="Primary image"
              hint={!checks.hasPrimaryImg && "Upload at least one image and mark one as Primary."}
            />
            <Check
              ok={checks.hasCategory}
              label="Category"
              hint={!checks.hasCategory && "Choose a primary category so customers can find it."}
            />
          </div>

          {!canPublish && (
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Complete the items above to enable publishing.
            </div>
          )}

          <div className="mt-5">
            <button
              onClick={publish}
              disabled={!canPublish || publishing}
              className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                canPublish ? "bg-emerald-600 hover:bg-emerald-500" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {publishing ? "Publishing…" : "Publish listing"}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Publishing sets the status to <b>active</b> and makes the listing visible to customers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


