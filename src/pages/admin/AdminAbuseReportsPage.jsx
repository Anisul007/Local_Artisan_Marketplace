import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminAbuseReportsPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [actionNote, setActionNote] = useState({});
  const [err, setErr] = useState("");
  const [notifyNew, setNotifyNew] = useState(null);

  async function load() {
    const r = await AdminAPI.abuseReports(status).catch(() => null);
    if (!r?.ok) return setErr("Could not load abuse reports");
    const d = r?.data?.data ?? r?.data ?? {};
    setItems(Array.isArray(d.items) ? d.items : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    (async () => {
      const r = await AdminAPI.notificationSummary().catch(() => null);
      const n = r?.data?.data ?? r?.data ?? {};
      if (typeof n.abuseReportsNew === "number") setNotifyNew(n.abuseReportsNew);
    })();
  }, []);

  async function act(id, nextStatus) {
    const r = await AdminAPI.actionAbuseReport(id, nextStatus, actionNote[id] || "").catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Could not update report");
    await load();
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">Abuse Reports</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
          <option value="">All</option>
          <option value="new">New</option>
          <option value="in_review">In review</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No reports found.</p>
        ) : (
          items.map((r) => (
            <div
              key={r._id}
              className={`rounded-xl border p-3 ${
                r.status === "new"
                  ? "border-l-4 border-l-rose-500 border-y border-r border-white/15 bg-rose-500/[0.06]"
                  : "border border-white/15 bg-white/[0.03]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {r.status === "new" && (
                    <span className="rounded-full bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Needs review</span>
                  )}
                  <div className="text-sm font-semibold text-white">{r.reason}</div>
                </div>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">{r.status}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Reporter: {r.reporterName || "Unknown"} {r.reporterEmail ? `(${r.reporterEmail})` : ""} · Date:{" "}
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
              </div>
              <p className="mt-2 text-sm text-slate-300">{r.details || "No details provided."}</p>
              <textarea
                value={actionNote[r._id] || ""}
                onChange={(e) => setActionNote((p) => ({ ...p, [r._id]: e.target.value }))}
                rows={2}
                placeholder="Action note..."
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 p-2 text-sm text-slate-100 placeholder:text-slate-400"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={() => act(r._id, "in_review")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
                  Mark In Review
                </button>
                <button onClick={() => act(r._id, "resolved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                  Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
