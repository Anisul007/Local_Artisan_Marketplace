// src/pages/vendor/VendorProfilePage.jsx
import { useEffect, useState } from "react";
import { VendorAPI } from "../../lib/api";
import Modal from "../../components/ux/Modal";
import VendorProfileForm from "../../pages/vendor/VendorProfileForm.jsx"; // <-- fixed path

export default function VendorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");

  async function fetchProfile() {
    setLoading(true);
    try {
      const r = await VendorAPI.getProfile(); // GET /api/vendor/profile
      setProfile(r?.data?.data ?? r?.data ?? {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleSave(next) {
    const r = await VendorAPI.updateProfile(next); // PUT /api/vendor/profile
    if (r?.data?.ok || r?.ok) {
      setOpen(false);
      setToast("Profile updated");
      await fetchProfile();
      window.dispatchEvent(new CustomEvent("vendor-profile-updated"));
      setTimeout(() => setToast(""), 1600);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  const p = profile || {};
  const addr = p.address || {};
  const address = [
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postcode].filter(Boolean).join(" "),
    addr.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl overflow-hidden ring-1 ring-gray-200 bg-gray-50 grid place-items-center">
            {p.logoUrl ? (
              <img src={p.logoUrl} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400">No logo</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {p.businessName || "Business profile"}
            </h1>
            {/* optional subtitle (owner name if you add it later) */}
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Edit profile
        </button>
      </div>

      {toast && (
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-200">
          {toast}
        </div>
      )}

      {/* About & Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="About">
          {p.bio ? <p className="text-gray-700 whitespace-pre-wrap">{p.bio}</p> : <Muted>No bio yet.</Muted>}
        </Card>

        <Card title="Contact">
          <Field label="Email" value={p.contactEmail} />
          <Field label="Phone" value={p.phone} />
          <Field label="Website" value={p.website} isLink />
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Socials</div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Social label="Instagram" val={p?.socials?.instagram} />
              <Social label="Facebook" val={p?.socials?.facebook} />
              <Social label="TikTok" val={p?.socials?.tiktok} />
            </div>
          </div>
        </Card>

        <Card title="Address">
          {address ? <p className="text-gray-700">{address}</p> : <Muted>No address yet.</Muted>}
        </Card>
      </div>

      {/* Policies & Tax (optional fields—render if provided) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Shipping policy">
          {p?.policies?.shipping ? (
            <p className="text-gray-700 whitespace-pre-wrap">{p.policies.shipping}</p>
          ) : (
            <Muted>No shipping policy yet.</Muted>
          )}
        </Card>
        <Card title="Returns policy">
          {p?.policies?.returns ? (
            <p className="text-gray-700 whitespace-pre-wrap">{p.policies.returns}</p>
          ) : (
            <Muted>No returns policy yet.</Muted>
          )}
        </Card>
        <Card title="Tax">
          <Field label="ABN / Tax number" value={p.taxNumber} />
        </Card>
      </div>

      {/* Bank (optional/private) */}
      <Card title="Bank details (private)">
        <Field label="BSB" value={p?.bank?.bsb} />
        <Field label="Account name" value={p?.bank?.accountName} />
        <Field label="Account number" value={p?.bank?.accountNumber} />
        {!p?.bank?.bsb && !p?.bank?.accountName && !p?.bank?.accountNumber && (
          <Muted>No bank details saved.</Muted>
        )}
      </Card>

      {/* Modal with form */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <VendorProfileForm
          value={profile}
          onSubmit={handleSave}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function Card({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 text-sm font-semibold text-gray-900">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, isLink = false }) {
  if (!value) return <div className="text-sm text-gray-500">—</div>;
  return (
    <div className="text-sm">
      <div className="text-xs text-gray-500">{label}</div>
      {isLink ? (
        <a
          className="text-indigo-700 hover:underline break-all"
          href={value}
          target="_blank"
          rel="noreferrer"
        >
          {value}
        </a>
      ) : (
        <div className="text-gray-800 break-words">{value}</div>
      )}
    </div>
  );
}

function Muted({ children }) {
  return <div className="text-sm text-gray-500">{children}</div>;
}

function Social({ label, val }) {
  if (!val) return null;
  const href =
    /^https?:\/\//i.test(val) ? val : `https://www.${label.toLowerCase()}.com/${val.replace(/^@/, "")}`;
  return (
    <a
      className="px-2.5 py-1 rounded-full border border-gray-300 text-sm hover:bg-gray-50"
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
    >
      {label}
    </a>
  );
}


