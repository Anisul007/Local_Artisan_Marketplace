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
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <h1 className="text-xl font-bold text-white">Vendor Accounts</h1>
      <p className="mt-1 text-sm text-slate-300">Deactivate vendors to enforce policy. Deactivated vendors cannot login.</p>
      <p className="mt-1 text-sm text-slate-400">
        Unverified accounts are highlighted below. Use <strong className="text-slate-300">Account status</strong> to list active, deactivated, or everyone.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
          <option value="">All accounts (active + deactivated)</option>
          <option value="active">Active accounts only</option>
          <option value="deactivated">Deactivated accounts only</option>
        </select>
        <select value={attention} onChange={(e) => setAttention(e.target.value)} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
          <option value="">All verification states</option>
          <option value="unverified">Needs email verification only</option>
        </select>
      </div>
      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-4 space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-400">No vendors in this view. Try &quot;All accounts&quot; if you expected more.</p>}
        {items.map((v) => {
          const needsEmail = v.isVerified === false;
          return (
            <div
              key={v._id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                needsEmail ? "border-l-4 border-l-rose-500 border-white/15 bg-rose-500/[0.06]" : "border-white/15 bg-white/[0.03]"
              }`}
            >
              <Link to={`/admin/users/${v._id}`} className="min-w-0 flex-1 rounded-lg outline-none ring-cyan-400/40 transition hover:bg-white/[0.04] focus-visible:ring-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">
                    {v.firstName} {v.lastName}
                  </span>
                  {needsEmail && (
                    <span className="shrink-0 rounded-full bg-rose-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Email not verified</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{v.email}</div>
                <div className="text-[11px] text-cyan-300/90">View full admin profile →</div>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/15 text-slate-300"}`}>
                  {v.isActive ? "Active" : "Deactivated"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(v.isActive ? "Deactivate this vendor account?" : "Reactivate this vendor account?");
                    if (ok) toggle(v);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${v.isActive ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
                >
                  {v.isActive ? "Deactivate" : "Reactivate"}
                </button>
                <button
                  type="button"
                  onClick={() => removeVendor(v)}
                  className="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                >
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
