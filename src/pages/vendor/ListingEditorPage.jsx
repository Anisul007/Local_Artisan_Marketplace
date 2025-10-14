// src/pages/vendor/ListingEditorPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ListingsAPI, CategoriesAPI } from "../../lib/api";
import ImageUploader from "../../components/vendor/ImageUploader.jsx";

/** The 10 storefront categories we support */
const OFFICIAL_SLUGS = [
  "accessories",
  "art-prints",
  "body-beauty",
  "fashion",
  "home",
  "jewellery",
  "kids",
  "occasion",
  "pantry",
  "pets",
];

const LABELS = {
  "accessories": "Accessories",
  "art-prints": "Art & Prints",
  "body-beauty": "Body & Beauty",
  "fashion": "Fashion",
  "home": "Home",
  "jewellery": "Jewellery",
  "kids": "Kids",
  "occasion": "Occasion",
  "pantry": "Pantry",
  "pets": "Pets",
};

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur })
    .format((Number(cents) || 0) / 100);

const clampCats = (primaryId, selectedIds, max = 3) =>
  Array.from(new Set([primaryId, ...selectedIds].filter(Boolean))).slice(0, max);

export default function ListingEditorPage({ isNew }) {
  const { id } = useParams();
  const nav = useNavigate();

  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    pricing: { currency: "AUD", priceCents: 0, compareAtCents: 0 },
    primaryCategory: "",
    categories: [],
    images: [],
    inventory: { stockQty: 0 },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load categories (server returns array in data or data.data)
  useEffect(() => {
    CategoriesAPI.all()
      .then((r) => {
        const arr = Array.isArray(r?.data) ? r.data :
                    Array.isArray(r?.data?.data) ? r.data.data : [];
        setCats(arr);
      })
      .catch(() => setCats([]));
  }, []);

  // Load doc if editing
  useEffect(() => {
    if (!isNew && id) {
      ListingsAPI.read(id).then((r) => {
        const doc = r?.data?.data ?? r?.data ?? null;
        if (!doc) return;
        setForm({
          title: doc.title ?? "",
          description: doc.description ?? "",
          pricing: {
            currency: doc.pricing?.currency || "AUD",
            priceCents: doc.pricing?.priceCents ?? 0,
            compareAtCents: doc.pricing?.compareAtCents ?? 0,
          },
          primaryCategory: doc.primaryCategory ?? "",
          categories: doc.categories ?? [],
          images: doc.images ?? [],
          inventory: { stockQty: doc.inventory?.stockQty ?? 0 },
        });
      });
    }
  }, [id, isNew]);

  const canSave = useMemo(() => {
    const p = Number(form.pricing?.priceCents) || 0;
    return form.title?.trim() && form.description?.trim() && p > 0 && form.primaryCategory;
  }, [form]);

  // cat lookup
  const bySlug = useMemo(() => {
    const m = new Map();
    cats.forEach((c) => c?.slug && m.set(c.slug, c));
    return m;
  }, [cats]);

  const allowedCats = useMemo(
    () => OFFICIAL_SLUGS.map((s) => bySlug.get(s)).filter(Boolean),
    [bySlug]
  );

  const selectedIds = (form.categories || []).map(String);
  const isPrimary = (x) => String(form.primaryCategory) === String(x);

  const setPrimary = (catId) => {
    const clamped = clampCats(catId, form.categories || [], 3);
    setForm((prev) => ({ ...prev, primaryCategory: catId, categories: clamped }));
  };

  const toggleAdditional = (catId) => {
    const idStr = String(catId);
    if (isPrimary(idStr)) return;
    const next = new Set(selectedIds);
    next.has(idStr) ? next.delete(idStr) : next.add(idStr);
    const clamped = clampCats(form.primaryCategory, Array.from(next), 3);
    setForm((prev) => ({ ...prev, categories: clamped }));
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      if (isNew) {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim(),
          priceCents: Number(form.pricing.priceCents),
          currency: form.pricing.currency || "AUD",
          primaryCategory: form.primaryCategory,
          categories: form.categories?.length ? form.categories : [form.primaryCategory],
          images: form.images ?? [],
        };
        const res = await ListingsAPI.create(payload);
        const saved = res?.data?.data ?? res?.data ?? null;
        const newId = saved?._id;
        if (!newId) throw new Error("Could not determine listing id after save.");
        nav(`/vendor/listings/${newId}/preview`);
      } else {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim(),
          pricing: {
            currency: form.pricing.currency || "AUD",
            priceCents: Number(form.pricing.priceCents) || 0,
            compareAtCents: Number(form.pricing.compareAtCents) || 0,
          },
          primaryCategory: form.primaryCategory,
          categories: form.categories?.length ? form.categories : [form.primaryCategory],
          images: form.images ?? [],
          inventory: { stockQty: Number(form.inventory?.stockQty) || 0 },
        };
        const res = await ListingsAPI.update(id, payload);
        const saved = res?.data?.data ?? res?.data ?? null;
        nav(`/vendor/listings/${saved?._id || id}/preview`);
      }
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const primaryImage =
    form.images?.find?.((i) => i?.isPrimary)?.url || form.images?.[0]?.url || "";

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-3">
      {/* LEFT: editor */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">
            {isNew ? "Create Product" : "Edit Product"}
          </h1>
          <div className="text-sm text-gray-500">
            <span className="text-rose-600">*</span> required
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
            {error}
          </div>
        )}

        {/* Basic */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Title <span className="text-rose-600">*</span>
              </label>
              <input
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="E.g. Hand-poured soy candle"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Description <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={6}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe materials, size, fragrance, care, etc."
              />
            </div>
          </div>
        </div>

        {/* Pricing / Stock */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-4 text-lg font-bold">Pricing & Stock</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">
                Price (cents) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                value={form.pricing.priceCents}
                onChange={(e) =>
                  setForm({ ...form, pricing: { ...form.pricing, priceCents: e.target.value } })
                }
                placeholder="e.g. 2500"
              />
              <div className="mt-1 text-xs text-gray-500">
                Preview: {money(form.pricing.priceCents, form.pricing.currency)}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Compare-at (cents)</label>
              <input
                type="number" min="0"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                value={form.pricing.compareAtCents}
                onChange={(e) =>
                  setForm({ ...form, pricing: { ...form.pricing, compareAtCents: e.target.value } })
                }
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Currency</label>
              <input
                disabled
                className="w-full rounded-xl border bg-gray-50 px-3 py-2 text-gray-600"
                value={form.pricing.currency}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Stock qty</label>
              <input
                type="number" min="0"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-indigo-400"
                value={form.inventory?.stockQty ?? 0}
                onChange={(e) =>
                  setForm({ ...form, inventory: { stockQty: Number(e.target.value) || 0 } })
                }
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Categories</h2>
            <div className="text-sm text-gray-500">
              Choose a primary and up to two more (3 max).
            </div>
          </div>

          <p className="mb-2 text-sm font-medium">
            Primary category <span className="text-rose-600">*</span>
          </p>

          {allowedCats.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {allowedCats.map((c) => {
                const label = LABELS[c.slug] || c.name || c.path || "Category";
                const active = isPrimary(c._id);
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => setPrimary(c._id)}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition
                      ${active ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className={`h-2 w-full rounded ${active ? "bg-indigo-500" : "bg-gradient-to-r from-rose-300 via-amber-300 to-indigo-300"}`} />
                    <div className="mt-3">
                      <div className="truncate font-bold text-gray-900">{label}</div>
                      <div className="truncate text-xs text-gray-500">{c.slug}</div>
                    </div>
                    {active && (
                      <span className="absolute right-2 top-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Primary
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No categories found. Seed the 10 categories and refresh.
            </div>
          )}

          {!!allowedCats.length && (
            <>
              <p className="mt-5 mb-2 text-sm font-medium">Additional categories</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allowedCats.map((c) => {
                  const idStr = String(c._id);
                  const label = LABELS[c.slug] || c.name || c.path || "Category";
                  const checked = selectedIds.includes(idStr);
                  const disabled = isPrimary(idStr);
                  return (
                    <label
                      key={c._id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm
                        ${disabled ? "bg-gray-50 border-gray-200 text-gray-400"
                                   : checked ? "border-indigo-500 bg-indigo-50"
                                             : "border-gray-200"}`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        disabled={disabled}
                        checked={checked || disabled}
                        onChange={() => toggleAdditional(c._id)}
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Up to 3 categories total (including primary).
              </div>
            </>
          )}
        </div>

        {/* Images */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-4 text-lg font-bold">Images</h2>
          <ImageUploader
            value={form.images}
            onChange={(next) => setForm((prev) => ({ ...prev, images: next }))}
          />
          <div className="mt-2 text-xs text-gray-500">
            Tip: set one image as <b>Primary</b> to publish.
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            disabled={saving || !canSave}
            onClick={save}
            className={`rounded-xl px-4 py-2 text-white ${canSave ? "bg-indigo-600 hover:bg-indigo-500" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {saving ? "Saving…" : "Save & Preview"}
          </button>
          <button onClick={() => nav("/vendor/listings")} className="rounded-xl border px-4 py-2">
            Cancel
          </button>
        </div>
      </div>

      {/* RIGHT: live preview */}
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-3 font-semibold">Preview</h3>
          <div className="overflow-hidden rounded-xl border">
            {primaryImage ? (
              <img src={primaryImage} alt="" className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 w-full items-center justify-center bg-gray-50 text-sm text-gray-400">
                No image yet
              </div>
            )}
            <div className="space-y-1 p-4">
              <div className="text-xs text-gray-500">Status</div>
              <div className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                Draft
              </div>
              <div className="mt-2 truncate text-base font-semibold">{form.title || "Untitled product"}</div>
              <div className="text-sm text-gray-600">
                {money(form.pricing.priceCents, form.pricing.currency)}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}


