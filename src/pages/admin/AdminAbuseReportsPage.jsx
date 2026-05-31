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
    <div className="admin-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="admin-card-title">Abuse Reports</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
          <option value="">All</option>
          <option value="new">New</option>
          <option value="in_review">In review</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="admin-muted">No reports found.</p>
        ) : (
          items.map((r) => (
            <div
              key={r._id}
              className={`rounded-xl border p-3 ${
                r.status === "new"
                  ? "border-l-4 border-l-rose-500 border-y border-r border-gray-200 bg-rose-500/[0.06]"
                  : "border border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {r.status === "new" && (
                    <span className="rounded-full bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Needs review</span>
                  )}
                  <div className="text-sm font-semibold text-gray-900">{r.reason}</div>
                </div>
                <span className="admin-badge-warn text-xs normal-case">{r.status}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Reporter: {r.reporterName || "Unknown"}
                {r.reporterEmail ? ` (${r.reporterEmail})` : ""}
                {r.reporterRole ? ` · ${r.reporterRole}` : ""} ·{" "}
                {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
              </div>
              {r.targetType && r.targetType !== "other" && (
                <div className="mt-1 text-xs text-gray-600">
                  About: <span className="font-medium capitalize">{r.targetType}</span>
                  {r.targetLabel ? ` — ${r.targetLabel}` : ""}
                  {r.targetId ? ` (ID: ${r.targetId})` : ""}
                </div>
              )}
              <p className="mt-2 text-sm text-gray-600">{r.details || "No details provided."}</p>
              <textarea
                value={actionNote[r._id] || ""}
                onChange={(e) => setActionNote((p) => ({ ...p, [r._id]: e.target.value }))}
                rows={2}
                placeholder="Action note..."
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-900 placeholder:text-gray-400"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={() => act(r._id, "in_review")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-blue-500">
                  Mark In Review
                </button>
                <button onClick={() => act(r._id, "resolved")} className="admin-btn admin-btn-sm admin-btn-success">
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
