import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminListingsModerationPage() {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await AdminAPI.pendingListings().catch(() => null);
    if (!r?.ok) return setErr("Could not load pending listings");
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function moderate(id, decision) {
    setErr("");
    setMsg("");
    const r = await AdminAPI.moderateListing(id, decision, note[id] || "").catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Action failed");
    setMsg(`Listing ${decision}d. Vendor notified.`);
    await load();
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <h1 className="text-xl font-bold text-white">Pending Listing Approval</h1>
      <p className="mt-1 text-sm text-slate-300">Review and approve/reject vendor listings before public visibility.</p>
      <p className="mt-1 text-sm text-slate-400">
        Every listing here is <strong className="text-slate-200">pending moderation</strong> and matches the red count on <strong className="text-slate-200">Listing Approval</strong> in the sidebar.
      </p>
      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No pending listings.</p>
        ) : (
          items.map((l) => (
            <div key={l._id} className="rounded-xl border border-amber-500/30 border-l-4 border-l-amber-400 bg-amber-500/[0.06] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-100">Pending approval</span>
                    <span className="font-semibold text-white">{l.title}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Vendor: {l.vendor?.firstName} {l.vendor?.lastName} ({l.vendor?.email})
                  </div>
                </div>
                <div className="text-sm font-semibold text-white">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: l?.pricing?.currency || "AUD" }).format((l?.pricing?.priceCents || 0) / 100)}
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-300">{l.description}</p>
              <textarea
                value={note[l._id] || ""}
                onChange={(e) => setNote((p) => ({ ...p, [l._id]: e.target.value }))}
                rows={2}
                placeholder="Optional review note..."
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 p-2 text-sm text-slate-100 placeholder:text-slate-400"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={() => moderate(l._id, "approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                  Approve
                </button>
                <button onClick={() => moderate(l._id, "reject")} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500">
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
