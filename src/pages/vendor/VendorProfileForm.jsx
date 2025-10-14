// src/components/vendor/VendorProfileForm.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { VendorAPI } from "../../lib/api";
import { X } from "lucide-react";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

export default function VendorProfileForm({ value, onSubmit, onCancel }) {
  /* --------------------------- state & helpers --------------------------- */
  const [form, setForm] = useState(() => ({
    businessName: "",
    ownerName: "",
    contactEmail: "",
    phone: "",
    about: "",
    website: "",
    socials: { instagram: "", facebook: "", tiktok: "" },
    address: { line1: "", line2: "", suburb: "", state: "", postCode: "", country: "AU" },
    taxNumber: "",
    policies: { shipping: "", returns: "" },
    bank: { bsb: "", accountName: "", accountNumber: "" },
    logoUrl: "",
    ...(value || {}),
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoErr, setLogoErr] = useState("");

  const bodyRef = useRef(null);
  const dropRef = useRef(null);

  const setField = (path, val) =>
    setForm((prev) => {
      const next = { ...prev };
      const segs = path.split(".");
      let cur = next;
      for (let i = 0; i < segs.length - 1; i++) {
        cur[segs[i]] = { ...(cur[segs[i]] || {}) };
        cur = cur[segs[i]];
      }
      cur[segs[segs.length - 1]] = val;
      return next;
    });

  const completeness = useMemo(() => {
    const checks = [
      !!form.businessName,
      !!form.contactEmail,
      !!form.logoUrl,
      !!form.address?.suburb,
      !!form.address?.state,
      !!form.taxNumber,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  function validate() {
    const e = {};
    if (!form.businessName?.trim()) e.businessName = "Business name is required.";
    if (!form.contactEmail?.trim()) e.contactEmail = "Contact email is required.";
    else if (!EMAIL_RX.test(form.contactEmail)) e.contactEmail = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e?.preventDefault?.();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit?.(form);
    } finally {
      setSaving(false);
    }
  }

  async function onPickLogo(file) {
    setLogoErr("");
    if (!file) return;
    if (!/image\/(jpeg|png)/.test(file.type)) return setLogoErr("Only JPEG/PNG allowed.");
    if (file.size > MAX_LOGO_BYTES) return setLogoErr("Max 2 MB.");

    try {
      setLogoUploading(true);
      const r = await VendorAPI.uploadLogo(file);
      const url =
        r?.data?.data?.url ||
        r?.data?.data?.logoUrl ||
        r?.data?.url ||
        r?.url;
      if (!url) throw new Error("Upload failed");
      setField("logoUrl", url);
    } catch (err) {
      setLogoErr(err.message || "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  // Drag & drop on the logo card
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onOver = (e) => {
      stop(e);
      el.classList.add("ring-2", "ring-indigo-300");
    };
    const onLeave = (e) => {
      stop(e);
      el.classList.remove("ring-2", "ring-indigo-300");
    };
    const onDrop = (e) => {
      stop(e);
      el.classList.remove("ring-2", "ring-indigo-300");
      const f = e.dataTransfer.files?.[0];
      if (f) onPickLogo(f);
    };
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onOver);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  /* ------------------------------- layout ------------------------------- */
  return (
    <div
      className="
        w-[min(1000px,95vw)]
        max-h-[86vh]
        overflow-hidden
        rounded-3xl
        bg-white
        shadow-2xl
      "
    >
      {/* Hero header */}
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 opacity-90" />
        <div className="px-6 pt-5 pb-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs/5 opacity-90">Business Profile</div>
              <h3 className="text-2xl font-bold tracking-tight">
                {form.businessName || "Edit Business Profile"}
              </h3>
              <p className="mt-1 text-sm opacity-90">
                Make your shopfront trustworthy and recognisable.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full bg-white/15 p-2 hover:bg-white/25"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* progress */}
          <div className="mt-3 h-2 w-56 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-2 bg-white"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Body (scroll) */}
      <form onSubmit={submit} ref={bodyRef} className="grid grid-cols-1 gap-6 overflow-y-auto px-6 py-6 md:grid-cols-12">
        {/* Left column */}
        <div className="md:col-span-5 space-y-6">
          {/* Logo card */}
          <Card>
            <div ref={dropRef} className="flex items-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">No logo</span>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Business logo</div>
                <p className="text-xs text-gray-500">Drag & drop or choose a file (JPEG/PNG, ≤2 MB)</p>
                <div className="mt-2 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => onPickLogo(e.target.files?.[0])}
                      disabled={logoUploading}
                    />
                    Choose file
                  </label>
                  {logoUploading && <span className="text-xs text-gray-600">Uploading…</span>}
                  {logoErr && <span className="text-xs text-rose-600">{logoErr}</span>}
                </div>
              </div>
            </div>
          </Card>

          {/* Contact */}
          <Card title="Contact">
            <Input
              label="Contact email *"
              value={form.contactEmail}
              onChange={(v) => setField("contactEmail", v)}
              error={errors.contactEmail}
            />
            <Input
              label="Phone"
              value={form.phone || ""}
              onChange={(v) => setField("phone", v)}
            />
            <Input
              label="Website"
              placeholder="https://"
              value={form.website || ""}
              onChange={(v) => setField("website", v)}
            />
          </Card>

          {/* Socials */}
          <Card title="Socials">
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Instagram"
                value={form.socials?.instagram || ""}
                onChange={(v) => setField("socials.instagram", v)}
              />
              <Input
                label="Facebook"
                value={form.socials?.facebook || ""}
                onChange={(v) => setField("socials.facebook", v)}
              />
              <Input
                label="TikTok"
                value={form.socials?.tiktok || ""}
                onChange={(v) => setField("socials.tiktok", v)}
              />
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="md:col-span-7 space-y-6">
          {/* Basics */}
          <Card title="Basics">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Business name *"
                value={form.businessName}
                onChange={(v) => setField("businessName", v)}
                error={errors.businessName}
              />
              <Input
                label="Owner name"
                value={form.ownerName || ""}
                onChange={(v) => setField("ownerName", v)}
              />
              <Textarea
                className="md:col-span-2"
                label="About"
                rows={4}
                value={form.about || ""}
                onChange={(v) => setField("about", v)}
              />
            </div>
          </Card>

          {/* Address */}
          <Card title="Address">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input placeholder="Line 1" value={form.address?.line1 || ""} onChange={(v) => setField("address.line1", v)} />
              <Input placeholder="Line 2" value={form.address?.line2 || ""} onChange={(v) => setField("address.line2", v)} />
              <Input placeholder="Suburb / City" value={form.address?.suburb || ""} onChange={(v) => setField("address.suburb", v)} />
              <Input placeholder="State" value={form.address?.state || ""} onChange={(v) => setField("address.state", v)} />
              <Input placeholder="Post Code" value={form.address?.postCode || ""} onChange={(v) => setField("address.postCode", v)} />
              <Input placeholder="Country" value={form.address?.country || "AU"} onChange={(v) => setField("address.country", v)} />
            </div>
          </Card>

          {/* Policies & Tax */}
          <Card title="Policies & Tax">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="ABN / Tax number" value={form.taxNumber || ""} onChange={(v) => setField("taxNumber", v)} />
              <div />
              <Textarea
                label="Shipping policy"
                rows={4}
                value={form.policies?.shipping || ""}
                onChange={(v) => setField("policies.shipping", v)}
              />
              <Textarea
                label="Returns policy"
                rows={4}
                value={form.policies?.returns || ""}
                onChange={(v) => setField("policies.returns", v)}
              />
            </div>
          </Card>

          {/* Bank */}
          <Card title="Bank details (private)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input label="BSB" value={form.bank?.bsb || ""} onChange={(v) => setField("bank.bsb", v)} />
              <Input label="Account name" value={form.bank?.accountName || ""} onChange={(v) => setField("bank.accountName", v)} />
              <Input label="Account number" value={form.bank?.accountNumber || ""} onChange={(v) => setField("bank.accountNumber", v)} />
            </div>
          </Card>
        </div>

        {/* spacer to avoid body covering sticky footer on iOS */}
        <div className="md:col-span-12 h-2" />
      </form>

      {/* Sticky actions */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-white/95 px-6 py-4 backdrop-blur">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------- UI bits ------------------------------- */

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {title && <div className="mb-3 text-sm font-semibold text-gray-900">{title}</div>}
      {children}
    </section>
  );
}

function Input({ label, value, onChange, placeholder, error, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="mb-1 text-sm font-medium text-gray-800">{label}</div>}
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-3 py-2 outline-none transition
        ${error ? "border-rose-300 ring-2 ring-rose-100" : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"}`}
      />
      {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 3, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="mb-1 text-sm font-medium text-gray-800">{label}</div>}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

