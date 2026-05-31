import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminAPI } from "../../lib/api";

function sortVendors(list) {
  return [...list].sort((a, b) => {
    const au = a.isVerified === false ? 1 : 0;
    const bu = b.isVerified === false ? 1 : 0;
    if (bu !== au) return bu - au;
    const ac = a.isActive ? 1 : 0;
    const bc = b.isActive ? 1 : 0;
    if (bc !== ac) return bc - ac;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export default function AdminVendorsPage() {
  const [items, setItems] = useState([]);
  const [attention, setAttention] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setErr("");
    const needsVerify = attention === "unverified" ? "1" : "";
    const r = await AdminAPI.vendors({ needsVerify, accountStatus }).catch(() => null);
    if (!r?.ok) return setErr("Could not load vendors");
    const d = r?.data?.data ?? r?.data ?? {};
    let list = Array.isArray(d.items) ? d.items : [];
    if (attention !== "unverified") list = sortVendors(list);
    setItems(list);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attention, accountStatus]);

  async function toggle(v) {
    setErr("");
    setMsg("");
    const r = v.isActive
      ? await AdminAPI.deactivateVendor(v._id).catch(() => null)
      : await AdminAPI.reactivateVendor(v._id).catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Could not update vendor");
    setMsg(v.isActive ? "Vendor deactivated." : "Vendor reactivated.");
    await load();
  }

  async function removeVendor(v) {
    setErr("");
    setMsg("");
    const typed = window.prompt(
      `Permanently delete ${v.email} and all their listings, reviews on those listings, and vendor promotions?\nType DELETE to confirm.`
    );
    if (typed !== "DELETE") {
      if (typed !== null) setErr("Confirmation text did not match.");
      return;
    }
    const r = await AdminAPI.deleteVendor(v._id).catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Could not delete vendor");
    setMsg("Vendor and shop data removed.");
    await load();
  }

  return (
    <div className="admin-card">
      <h1 className="admin-card-title">Vendor Accounts</h1>
      <p className="mt-1 text-sm text-gray-600">Deactivate vendors to enforce policy. Deactivated vendors cannot login.</p>
      <p className="mt-1 admin-muted">
        Unverified accounts are highlighted below. Use <strong className="text-gray-600">Account status</strong> to list active, deactivated, or everyone.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="admin-select">
          <option value="">All accounts (active + deactivated)</option>
          <option value="active">Active accounts only</option>
          <option value="deactivated">Deactivated accounts only</option>
        </select>
        <select value={attention} onChange={(e) => setAttention(e.target.value)} className="admin-select">
          <option value="">All verification states</option>
          <option value="unverified">Needs email verification only</option>
        </select>
      </div>
      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="admin-muted">No vendors in this view. Try &quot;All accounts&quot; if you expected more.</p>}
        {items.map((v) => {
          const needsEmail = v.isVerified === false;
          return (
            <div
              key={v._id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                needsEmail ? "border-l-4 border-l-rose-500 border-gray-200 bg-rose-500/[0.06]" : "border-gray-200 bg-gray-50"
              }`}
            >
              <Link to={`/admin/users/${v._id}`} className="min-w-0 flex-1 rounded-lg outline-none ring-[#4b0082]/30 transition hover:bg-gray-50 focus-visible:ring-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {v.firstName} {v.lastName}
                  </span>
                  {needsEmail && (
                    <span className="shrink-0 rounded-full bg-rose-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Email not verified</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{v.email}</div>
                <div className="text-[11px] text-[#4b0082] font-medium">View full profile →</div>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className={v.isActive ? "admin-badge-ok text-xs normal-case" : "admin-badge-muted text-xs normal-case"}>
                  {v.isActive ? "Active" : "Deactivated"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(v.isActive ? "Deactivate this vendor account?" : "Reactivate this vendor account?");
                    if (ok) toggle(v);
                  }}
                  className={`admin-btn admin-btn-sm ${v.isActive ? "admin-btn-danger" : "admin-btn-success"}`}
                >
                  {v.isActive ? "Deactivate" : "Reactivate"}
                </button>
                <button type="button" onClick={() => removeVendor(v)} className="admin-btn admin-btn-sm admin-btn-ghost-danger">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
