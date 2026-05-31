import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  FaBell,
  FaShoppingBag,
  FaCommentDots,
  FaBullhorn,
  FaShieldAlt,
  FaClipboardList,
  FaStar,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { CustomerNotificationsAPI } from "../../lib/api";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "orders", label: "Orders" },
  { id: "messages", label: "Messages" },
  { id: "reports", label: "Reports" },
];

const TYPE_META = {
  order_placed: { icon: FaClipboardList, tone: "bg-emerald-100 text-emerald-800" },
  order_status: { icon: FaShoppingBag, tone: "bg-indigo-100 text-indigo-800" },
  review_invite: { icon: FaStar, tone: "bg-amber-100 text-amber-800" },
  vendor_message: { icon: FaCommentDots, tone: "bg-sky-100 text-sky-800" },
  platform_message: { icon: FaBullhorn, tone: "bg-violet-100 text-violet-800" },
  abuse_report: { icon: FaShieldAlt, tone: "bg-rose-100 text-rose-800" },
  abuse_report_update: { icon: FaShieldAlt, tone: "bg-rose-50 text-rose-700" },
};

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bumpCustomerNotify() {
  window.dispatchEvent(new Event("customer-notifications-changed"));
}

export default function CustomerNotificationsPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState("all");
  const [pageLoading, setPageLoading] = useState(true);
  const [err, setErr] = useState("");
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setPageLoading(true);
    setErr("");
    try {
      const r = await CustomerNotificationsAPI.list();
      if (!r?.ok) throw new Error(r?.data?.message || "Could not load notifications");
      const data = r?.data?.data ?? r?.data ?? {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setSummary(data.summary || null);
    } catch (e) {
      setErr(e?.message || "Could not load notifications");
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "customer") load();
  }, [user, load]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((it) => it.category === filter);
  }, [items, filter]);

  const unreadCount = Number(summary?.unreadTotal ?? items.filter((i) => i.unread).length);

  async function markAllRead() {
    setMarking(true);
    try {
      const r = await CustomerNotificationsAPI.markSeen();
      if (!r?.ok) throw new Error(r?.data?.message || "Could not update");
      bumpCustomerNotify();
      await load();
    } catch (e) {
      setErr(e?.message || "Could not mark as read");
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
      </main>
    );
  }

  if (!user) return <Navigate to="/login?next=/account/notifications" replace />;
  if (user.role === "vendor") return <Navigate to="/vendor/notifications" replace />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-purple-600 text-white shadow-sm">
              <FaBell />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="mt-1 text-sm text-gray-600">
                Order updates, review invites after delivery, messages from sellers, platform notes, and abuse report
                responses.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/account"
              className="h-10 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={load}
              disabled={pageLoading}
              className="h-10 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Refresh
            </button>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking}
                className="h-10 rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
              >
                {marking ? "Updating…" : "Mark all as read"}
              </button>
            ) : null}
          </div>
        </div>

        {summary ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {summary.orderUpdates > 0 ? (
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-semibold text-indigo-800">
                {summary.orderUpdates} order update{summary.orderUpdates === 1 ? "" : "s"}
              </span>
            ) : null}
            {summary.vendorMessages > 0 ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-800">
                {summary.vendorMessages} seller message{summary.vendorMessages === 1 ? "" : "s"}
              </span>
            ) : null}
            {summary.platformMessages > 0 ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-800">
                {summary.platformMessages} platform
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.id ? "bg-purple-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {pageLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading notifications…</p>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FaBell className="mx-auto text-3xl text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-700">No notifications here</p>
            <p className="mt-1 text-xs text-gray-500">
              {filter === "all"
                ? "You're all caught up. Order and message updates will show up here."
                : "Nothing in this category right now."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const meta = TYPE_META[item.type] || { icon: FaBell, tone: "bg-gray-100 text-gray-700" };
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <Link
                    to={item.linkTo || "/orders"}
                    className={`flex gap-3 px-4 py-4 transition-colors hover:bg-gray-50 ${item.unread ? "bg-purple-50/50" : ""}`}
                  >
                    <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tone}`}>
                      <Icon className="text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                        {item.unread ? (
                          <span className="rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-600">{item.body}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatWhen(item.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
