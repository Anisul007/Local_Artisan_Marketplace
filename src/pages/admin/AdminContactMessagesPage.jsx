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
    <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Contact Messages</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            These are submissions from the public <strong className="text-slate-300">Contact Us</strong> page only. Messages between a vendor and customer on an order appear under{" "}
            <strong className="text-slate-300">Orders</strong>, then expand an order and open &quot;View messages and details&quot;.
          </p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-white/20 bg-white/5 px-3 text-sm text-slate-100">
          <option value="">All</option>
          <option value="new">New</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Messages still marked <strong className="text-slate-200">new</strong> are what the sidebar badge counts; they are highlighted in the list.
      </p>
      {(notifyNew ?? 0) > 0 && status !== "new" && (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          <span className="font-semibold">{notifyNew}</span> new message{notifyNew === 1 ? "" : "s"}.{" "}
          <button type="button" className="underline decoration-rose-200/80 hover:text-white" onClick={() => setStatus("new")}>
            Show new only
          </button>
        </div>
      )}
      {msg && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div>}
      {err && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No contact messages.</p>
        ) : (
          items.map((m) => (
            <div
              key={m._id}
              className={`rounded-xl border p-3 ${
                m.status === "new"
                  ? "border-l-4 border-l-rose-500 border-y border-r border-white/15 bg-rose-500/[0.06]"
                  : "border border-white/15 bg-white/[0.03]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {m.status === "new" && (
                    <span className="rounded-full bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">New</span>
                  )}
                  <div className="font-semibold text-white">
                    {m.name} · {m.email}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.status === "resolved" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {m.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{m.message}</p>
              <textarea
                value={response[m._id] || ""}
                onChange={(e) => setResponse((p) => ({ ...p, [m._id]: e.target.value }))}
                rows={2}
                placeholder="Type your response..."
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 p-2 text-sm text-slate-100 placeholder:text-slate-400"
              />
              <button onClick={() => reply(m._id)} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                Send response + Resolve
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
