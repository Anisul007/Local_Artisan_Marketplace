// src/pages/vendor/VendorProfileForm.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { VendorAPI } from "../../lib/api";
import { X } from "lucide-react";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

const defaultAddress = () => ({ line1: "", line2: "", city: "", state: "", postcode: "", country: "AU" });

export default function VendorProfileForm({ value, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => {
    const val = value || {};
    const { address: _addr, ...rest } = val;
    return {
      businessName: "",
      ownerName: "",
      contactEmail: "",
      phone: "",
      bio: "",
      website: "",
      socials: { instagram: "", facebook: "", tiktok: "" },
      address: { ...defaultAddress(), ...(val.address || {}) },
      taxNumber: "",
      policies: { shipping: "", returns: "" },
      bank: { bsb: "", accountName: "", accountNumber: "" },
      logoUrl: "",
      brandColor: "",
      ...rest,
    };
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoErr, setLogoErr] = useState("");
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
      !!form.address?.city,
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
      if (r?.ok === false) {
        throw new Error(r?.data?.message || "Upload failed");
      }
      const url = r?.data?.data?.url ?? r?.data?.data?.logoUrl ?? r?.data?.url ?? r?.url;
      if (!url) throw new Error("Upload failed");
      setField("logoUrl", url);
    } catch (err) {
      setLogoErr(err.message || "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onOver = (e) => {
      stop(e);
      el.classList.add("ring-2", "ring-indigo-400");
    };
    const onLeave = (e) => {
      stop(e);
      el.classList.remove("ring-2", "ring-indigo-400");
    };
    const onDrop = (e) => {
      stop(e);
      el.classList.remove("ring-2", "ring-indigo-400");
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit business profile</h2>
            <p className="mt-0.5 text-sm text-gray-500">Update your shop details and visibility.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-500">{completeness}% complete</span>
        </div>
      </div>

      {/* Scrollable body */}
      <form
        onSubmit={submit}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-12">
            {/* Left column */}
            <div className="md:col-span-5 space-y-5">
              <Card title="Logo">
                <div
                  ref={dropRef}
                  className="flex items-center gap-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-4 transition"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No logo</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">Business logo</p>
                    <p className="mt-0.5 text-xs text-gray-500">JPEG or PNG, max 2 MB</p>
                    <label className="mt-2 inline-block">
                      <span className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Choose file
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => onPickLogo(e.target.files?.[0])}
                        disabled={logoUploading}
                      />
                    </label>
                    {logoUploading && <span className="ml-2 text-xs text-gray-500">Uploading…</span>}
                    {logoErr && <p className="mt-1 text-xs text-red-600">{logoErr}</p>}
                  </div>
                </div>
              </Card>

              <Card title="Contact">
                <Input
                  label="Contact email *"
                  type="email"
                  value={form.contactEmail}
                  onChange={(v) => setField("contactEmail", v)}
                  error={errors.contactEmail}
                />
                <Input label="Phone" value={form.phone || ""} onChange={(v) => setField("phone", v)} />
                <Input label="Website" placeholder="https://" value={form.website || ""} onChange={(v) => setField("website", v)} />
              </Card>

              <Card title="Social links">
                <Input label="Instagram" placeholder="@handle" value={form.socials?.instagram || ""} onChange={(v) => setField("socials.instagram", v)} />
                <Input label="Facebook" value={form.socials?.facebook || ""} onChange={(v) => setField("socials.facebook", v)} />
                <Input label="TikTok" value={form.socials?.tiktok || ""} onChange={(v) => setField("socials.tiktok", v)} />
              </Card>
            </div>

            {/* Right column */}
            <div className="md:col-span-7 space-y-5">
              <Card title="Basics">
                <Input
                  label="Business name *"
                  value={form.businessName}
                  onChange={(v) => setField("businessName", v)}
                  error={errors.businessName}
                />
                <Input label="Owner / display name" value={form.ownerName || ""} onChange={(v) => setField("ownerName", v)} />
                <Textarea
                  label="About your business"
                  rows={4}
                  value={form.bio || ""}
                  onChange={(v) => setField("bio", v)}
                  placeholder="Short description for your storefront."
                />
              </Card>

              <Card title="Address">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input className="sm:col-span-2" placeholder="Address line 1" value={form.address?.line1 || ""} onChange={(v) => setField("address.line1", v)} />
                  <Input className="sm:col-span-2" placeholder="Address line 2" value={form.address?.line2 || ""} onChange={(v) => setField("address.line2", v)} />
                  <Input placeholder="City / suburb" value={form.address?.city || ""} onChange={(v) => setField("address.city", v)} />
                  <Input placeholder="State" value={form.address?.state || ""} onChange={(v) => setField("address.state", v)} />
                  <Input placeholder="Postcode" value={form.address?.postcode || ""} onChange={(v) => setField("address.postcode", v)} />
                  <Input placeholder="Country" value={form.address?.country || "AU"} onChange={(v) => setField("address.country", v)} />
                </div>
              </Card>

              <Card title="Policies & tax">
                <Input label="ABN / Tax number" value={form.taxNumber || ""} onChange={(v) => setField("taxNumber", v)} />
                <Textarea label="Shipping policy" rows={3} value={form.policies?.shipping || ""} onChange={(v) => setField("policies.shipping", v)} />
                <Textarea label="Returns policy" rows={3} value={form.policies?.returns || ""} onChange={(v) => setField("policies.returns", v)} />
              </Card>

              <Card title="Bank details (private)">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input label="BSB" value={form.bank?.bsb || ""} onChange={(v) => setField("bank.bsb", v)} />
                  <Input label="Account name" value={form.bank?.accountName || ""} onChange={(v) => setField("bank.accountName", v)} />
                  <Input label="Account number" value={form.bank?.accountNumber || ""} onChange={(v) => setField("bank.accountNumber", v)} />
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {title && <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, placeholder, error, type = "text", className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-gray-900 outline-none transition placeholder:text-gray-400
          ${error ? "border-red-300 ring-2 ring-red-100" : "border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 3, placeholder, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}
