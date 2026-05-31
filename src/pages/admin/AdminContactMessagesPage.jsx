import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminContactMessagesPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [response, setResponse] = useState({});
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [notifyNew, setNotifyNew] = useState(null);

  async function load() {
    const r = await AdminAPI.contactMessages(status).catch(() => null);
    if (!r?.ok) return setErr("Could not load contact messages");
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
      if (typeof n.contactMessagesNew === "number") setNotifyNew(n.contactMessagesNew);
    })();
  }, []);

  async function reply(id) {
    setErr("");
    setMsg("");
    const text = String(response[id] || "").trim();
    if (!text) return;
    const r = await AdminAPI.respondContactMessage(id, text).catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Could not send reply");
    setMsg("Response sent and message marked resolved.");
    setResponse((p) => ({ ...p, [id]: "" }));
    await load();
  }

  return (
    <div className="admin-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="admin-card-title">Contact Messages</h1>
          <p className="mt-1 max-w-2xl admin-muted">
            These are submissions from the public <strong className="text-gray-800">Contact Us</strong> page only. Messages between a vendor and customer on an order appear under{" "}
            <strong className="text-gray-800">Orders</strong> — open an order to read messages there.
          </p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select min-w-[10rem]">
          <option value="">All</option>
          <option value="new">New</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      <p className="mt-2 admin-muted">
        Messages still marked <strong className="text-gray-700">new</strong> are what the sidebar badge counts; they are highlighted in the list.
      </p>
      {(notifyNew ?? 0) > 0 && status !== "new" && (
        <div className="admin-alert-warn mt-3">
          <span className="font-semibold">{notifyNew}</span> new message{notifyNew === 1 ? "" : "s"}.{" "}
          <button type="button" className="font-semibold text-[#4b0082] underline hover:text-[#ff6600]" onClick={() => setStatus("new")}>
            Show new only
          </button>
        </div>
      )}
      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="admin-muted">No contact messages.</p>
        ) : (
          items.map((m) => (
            <div
              key={m._id}
              className={`rounded-xl border p-3 ${
                m.status === "new"
                  ? "border-l-4 border-l-rose-500 border-y border-r border-gray-200 bg-rose-500/[0.06]"
                  : "border border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {m.status === "new" && (
                    <span className="admin-badge-new text-[10px]">New</span>
                  )}
                  <div className="font-semibold text-gray-900">
                    {m.name} · {m.email}
                  </div>
                </div>
                <span className={`text-xs font-semibold ${m.status === "resolved" ? "admin-badge-ok normal-case" : "admin-badge-pending normal-case"}`}>
                  {m.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{m.message}</p>
              <textarea
                value={response[m._id] || ""}
                onChange={(e) => setResponse((p) => ({ ...p, [m._id]: e.target.value }))}
                rows={2}
                placeholder="Type your response..."
                className="admin-textarea mt-2"
              />
              <button onClick={() => reply(m._id)} className="mt-2 admin-btn admin-btn-sm admin-btn-brand">
                Send response + Resolve
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
