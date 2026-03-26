// src/pages/vendor/ListingEditorPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ListingsAPI, CategoriesAPI } from "../../lib/api";
import ImageUploader from "../../components/vendor/ImageUploader.jsx";

const OFFICIAL_SLUGS = [
  "accessories", "art-prints", "body-beauty", "fashion", "home",
  "jewellery", "kids", "occasion", "pantry", "pets",
];

const LABELS = {
  accessories: "Accessories",
  "art-prints": "Art & Prints",
  "body-beauty": "Body & Beauty",
  fashion: "Fashion",
  home: "Home",
  jewellery: "Jewellery",
  kids: "Kids",
  occasion: "Occasion",
  pantry: "Pantry",
  pets: "Pets",
};

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur })
    .format((Number(cents) || 0) / 100);

const dollarsToCents = (dollars) => Math.round(Number(dollars) * 100) || 0;
const centsToDollars = (cents) => (Number(cents) || 0) / 100;

const clampCats = (primaryId, selectedIds, max = 3) =>
  Array.from(new Set([primaryId, ...selectedIds].filter(Boolean))).slice(0, max);

const FormSection = ({ step, title, description, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
        {step}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
    </div>
    {children}
  </section>
);

export default function ListingEditorPage({ isNew }) {
  const { id } = useParams();
  const nav = useNavigate();

  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priceDollars: "",
    compareAtDollars: "",
    currency: "AUD",
    primaryCategory: "",
    categories: [],
    images: [],
    stockQty: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState({ title: false, description: false, price: false });

  useEffect(() => {
    CategoriesAPI.all()
      .then((r) => {
        const arr = Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : [];
        setCats(arr);
      })
      .catch(() => setCats([]));
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      ListingsAPI.read(id).then((r) => {
        const doc = r?.data?.data ?? r?.data ?? null;
        if (!doc) return;
        setForm({
          title: doc.title ?? "",
          description: doc.description ?? "",
          priceDollars: doc.pricing?.priceCents != null ? String(centsToDollars(doc.pricing.priceCents)) : "",
          compareAtDollars: doc.pricing?.compareAtCents ? String(centsToDollars(doc.pricing.compareAtCents)) : "",
          currency: doc.pricing?.currency || "AUD",
          primaryCategory: doc.primaryCategory ?? "",
          categories: doc.categories ?? [],
          images: doc.images ?? [],
          stockQty: doc.inventory?.stockQty ?? 0,
        });
      });
    }
  }, [id, isNew]);

  const priceCents = useMemo(() => dollarsToCents(form.priceDollars), [form.priceDollars]);
  const compareAtCents = useMemo(() => dollarsToCents(form.compareAtDollars), [form.compareAtDollars]);

  const canSave = useMemo(() => {
    return (
      form.title?.trim() &&
      form.description?.trim() &&
      priceCents > 0 &&
      form.primaryCategory
    );
  }, [form.title, form.description, priceCents, form.primaryCategory]);

  const validation = useMemo(() => {
    const v = {};
    if (touched.title && !form.title?.trim()) v.title = "Title is required.";
    if (touched.description && !form.description?.trim()) v.description = "Description is required.";
    if (touched.price && priceCents <= 0) v.price = "Enter a valid price greater than 0.";
    return v;
  }, [touched, form.title, form.description, priceCents]);

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
    setTouched({ title: true, description: true, price: true });
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        const payload = {
          title: form.title.trim(),
          description: form.description.trim(),
          priceCents,
          currency: form.currency || "AUD",
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
            currency: form.currency || "AUD",
            priceCents,
            compareAtCents,
          },
          primaryCategory: form.primaryCategory,
          categories: form.categories?.length ? form.categories : [form.primaryCategory],
          images: form.images ?? [],
          inventory: { stockQty: Number(form.stockQty) || 0 },
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

  const inputClass = (invalid) =>
    `w-full rounded-xl border px-4 py-2.5 text-gray-900 placeholder-gray-400 outline-none transition
     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
     ${invalid ? "border-red-300 bg-red-50/50" : "border-gray-300"}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "Add new product" : "Edit product"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isNew ? "Fill in the details below to list your item." : "Update your listing and save."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => nav("/vendor/listings")}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !canSave}
            onClick={save}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:pointer-events-none disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save & preview"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FormSection
            step={1}
            title="Product details"
            description="Name and description customers will see."
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Product title <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputClass(!!validation.title)}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  placeholder="e.g. Hand-poured soy candle, Lavender & Eucalyptus"
                  maxLength={120}
                />
                {validation.title && <p className="mt-1 text-xs text-red-600">{validation.title}</p>}
                <p className="mt-1 text-xs text-gray-500">Clear, descriptive titles perform better.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  className={inputClass(!!validation.description)}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  placeholder="Materials, dimensions, care instructions, and what makes it special."
                />
                {validation.description && <p className="mt-1 text-xs text-red-600">{validation.description}</p>}
              </div>
            </div>
          </FormSection>

          <FormSection
            step={2}
            title="Media"
            description="Photos help buyers trust your product. Set one as primary."
          >
            <ImageUploader
              value={form.images}
              onChange={(next) => setForm((prev) => ({ ...prev, images: next }))}
            />
            <p className="mt-3 text-xs text-gray-500">Primary image is shown in search and on the product page.</p>
          </FormSection>

          <FormSection
            step={3}
            title="Pricing & inventory"
            description="Set price in AUD. Optional compare-at price shows a discount."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Price (AUD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass(!!validation.price)}
                  value={form.priceDollars}
                  onChange={(e) => setForm({ ...form, priceDollars: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, price: true }))}
                  placeholder="25.00"
                />
                {validation.price && <p className="mt-1 text-xs text-red-600">{validation.price}</p>}
                {form.priceDollars && !validation.price && (
                  <p className="mt-1 text-xs text-gray-500">Display: {money(priceCents, "AUD")}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Compare-at price (AUD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass(false)}
                  value={form.compareAtDollars}
                  onChange={(e) => setForm({ ...form, compareAtDollars: e.target.value })}
                  placeholder="30.00"
                />
                <p className="mt-1 text-xs text-gray-500">Optional. Shows as “was $X” when higher than price.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Stock quantity</label>
                <input
                  type="number"
                  min="0"
                  className={inputClass(false)}
                  value={form.stockQty}
                  onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            step={4}
            title="Categories"
            description="Choose a primary category and up to 2 more (3 total)."
          >
            <p className="mb-3 text-sm font-medium text-gray-700">Primary category <span className="text-red-500">*</span></p>
            {allowedCats.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {allowedCats.map((c) => {
                  const label = LABELS[c.slug] || c.name || c.path || "Category";
                  const active = isPrimary(c._id);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setPrimary(c._id)}
                      className={`relative rounded-xl border p-3 text-left transition
                        ${active ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
                    >
                      <div className={`mb-2 h-1 w-full rounded ${active ? "bg-indigo-500" : "bg-gray-200"}`} />
                      <div className="truncate text-sm font-medium text-gray-900">{label}</div>
                      {active && (
                        <span className="absolute right-2 top-2 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Primary
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No categories available. Refresh the page or contact support.
              </div>
            )}

            {!!allowedCats.length && (
              <>
                <p className="mt-5 mb-2 text-sm font-medium text-gray-700">Additional categories</p>
                <div className="flex flex-wrap gap-2">
                  {allowedCats.map((c) => {
                    const idStr = String(c._id);
                    const label = LABELS[c.slug] || c.name || c.path || "Category";
                    const checked = selectedIds.includes(idStr);
                    const disabled = isPrimary(idStr);
                    return (
                      <label
                        key={c._id}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm
                          ${disabled ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400" : ""}
                          ${!disabled && checked ? "border-indigo-500 bg-indigo-50 text-indigo-800" : ""}
                          ${!disabled && !checked ? "border-gray-200 hover:border-gray-300" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                          disabled={disabled}
                          checked={checked || disabled}
                          onChange={() => toggleAdditional(c._id)}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </FormSection>

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              disabled={saving || !canSave}
              onClick={save}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:pointer-events-none disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & preview"}
            </button>
            <button
              type="button"
              onClick={() => nav("/vendor/listings")}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Live preview</h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              {primaryImage ? (
                <img src={primaryImage} alt="" className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                  No image
                </div>
              )}
              <div className="space-y-1 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Draft
                  </span>
                </div>
                <div className="truncate font-medium text-gray-900">{form.title || "Untitled product"}</div>
                <div className="text-sm font-semibold text-indigo-600">
                  {form.priceDollars ? money(priceCents, form.currency) : "—"}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
