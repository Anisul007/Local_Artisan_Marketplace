import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdminAPI } from "../../lib/api";

const money = (cents, currency = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format((Number(cents) || 0) / 100);

const emptyDashboard = {
  counters: {
    totalCustomers: 0,
    totalVendors: 0,
    totalAdmins: 0,
    totalMembers: 0,
    totalOrders: 0,
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    platformRevenueCents: 0,
  },
  trends: {
    monthlyUserGrowth: [],
    monthlyOrders: [],
    monthlyListings: [],
  },
};

export default function AdminDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [notify, setNotify] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let timer;
    let mounted = true;
    async function load() {
      const [p, d, n] = await Promise.allSettled([
        AdminAPI.getProfile(),
        AdminAPI.dashboard(),
        AdminAPI.notificationSummary(),
      ]);
      if (!mounted) return;
      if (p.status === "fulfilled" && p.value?.ok) setProfile(p.value?.data?.data || p.value?.data || null);
      if (d.status === "fulfilled" && d.value?.ok) {
        const raw = d.value?.data?.data || d.value?.data || {};
        setDashboard(normalizeDashboard(raw));
      }
      if (n.status === "fulfilled" && n.value?.ok) {
        setNotify(n.value?.data?.data || n.value?.data || null);
      }
    }
    load();
    timer = setInterval(load, 45_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const c = dashboard.counters;
  const trends = dashboard.trends;

  const maxUserGrowth = useMemo(
    () => Math.max(1, ...(trends.monthlyUserGrowth || []).map((m) => Number(m.count || m.customers + m.vendors || 0))),
    [trends.monthlyUserGrowth]
  );
  const maxOrders = useMemo(
    () => Math.max(1, ...(trends.monthlyOrders || []).map((m) => Number(m.count || 0))),
    [trends.monthlyOrders]
  );
  const maxRevenue = useMemo(
    () => Math.max(1, ...(trends.monthlyOrders || []).map((m) => Number(m.revenueCents || 0))),
    [trends.monthlyOrders]
  );
  const maxListings = useMemo(
    () => Math.max(1, ...(trends.monthlyListings || []).map((m) => Number(m.count || 0))),
    [trends.monthlyListings]
  );

  const reportCsv = AdminAPI.exportReportUrl({ format: "excel", from, to });
  const reportPdf = AdminAPI.exportReportUrl({ format: "pdf", from, to });

  const attentionItems = useMemo(() => {
    if (!notify) return [];
    const items = [];
    if (notify.pendingListings > 0)
      items.push({ label: "Listings awaiting moderation", value: notify.pendingListings, to: "/admin/listings", tone: "amber" });
    if (notify.contactMessagesNew > 0)
      items.push({ label: "New contact messages", value: notify.contactMessagesNew, to: "/admin/contact-messages", tone: "cyan" });
    if (notify.abuseReportsNew > 0)
      items.push({ label: "Abuse reports (new)", value: notify.abuseReportsNew, to: "/admin/abuse-reports", tone: "rose" });
    if (notify.ordersNew > 0)
      items.push({ label: "Orders needing attention", value: notify.ordersNew, to: "/admin/orders", tone: "violet" });
    if (notify.openOrderIssues > 0)
      items.push({ label: "Open order issues", value: notify.openOrderIssues, to: "/admin/orders", tone: "orange" });
    if (notify.unverifiedVendors > 0)
      items.push({ label: "Vendors unverified", value: notify.unverifiedVendors, to: "/admin/vendors", tone: "slate" });
    if (notify.unverifiedCustomers > 0)
      items.push({ label: "Customers unverified", value: notify.unverifiedCustomers, to: "/admin/customers", tone: "slate" });
    return items;
  }, [notify]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-indigo-600/80 via-fuchsia-600/70 to-cyan-500/70 p-5 text-white shadow-xl shadow-indigo-900/40">
        <h1 className="text-2xl font-black tracking-tight">Platform command center</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/90">
          Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}. Monitor member growth, catalog size, order volume, and
          gross merchandise value — with trends that refresh automatically.
        </p>
      </div>

      {attentionItems.length > 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-200">Needs attention</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900/80"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 tabular-nums">{item.value}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Customers" value={c.totalCustomers} sub="Registered buyers" />
        <Kpi label="Vendors" value={c.totalVendors} sub="Seller accounts" />
        <Kpi label="Total members" value={c.totalMembers} sub="Customers + vendors + admins" />
        <Kpi label="Listings" value={c.totalListings} sub={`${c.activeListings || 0} active`} />
        <Kpi label="Orders" value={c.totalOrders} sub="All time" />
        <Kpi label="Platform GMV" value={money(c.platformRevenueCents)} sub="Sum of order totals" accent />
      </div>

      {c.pendingListings > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
          <span>
            <strong className="text-white">{c.pendingListings}</strong> listing(s) pending moderation
          </span>
          <Link to="/admin/listings" className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">
            Review queue
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Platform analytics</h2>
            <p className="mt-1 text-xs text-slate-400">
              User growth (new customers & vendors), listing volume, orders, and revenue by month.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-300">
              Report from
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block h-9 rounded-lg border border-white/20 bg-white/5 px-2 text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block h-9 rounded-lg border border-white/20 bg-white/5 px-2 text-slate-100"
              />
            </label>
            <a
              href={reportCsv}
              className="h-9 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/20"
            >
              Export CSV
            </a>
            <a
              href={reportPdf}
              className="h-9 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/20"
            >
              Export PDF
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ChartCard title="User growth" subtitle="New customers & vendors per month (excludes admin accounts)">
            <div className="mt-3 flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 120 }}>
              {(trends.monthlyUserGrowth || []).slice(-12).map((m) => {
                const cust = Number(m.customers || 0);
                const vend = Number(m.vendors || 0);
                const total = cust + vend || Number(m.count || 0);
                const hTotal = Math.max(6, Math.round((total / maxUserGrowth) * 100));
                const hCust = total > 0 ? Math.round((cust / total) * hTotal) : 0;
                const hVend = total > 0 ? Math.max(0, hTotal - hCust) : 0;
                const label = m.month && m.month.length >= 7 ? m.month.slice(5) : m.month;
                return (
                  <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="flex h-[104px] w-full max-w-[40px] flex-col justify-end rounded-t bg-slate-800/80 sm:max-w-none"
                      title={`${m.month}: ${cust} customers, ${vend} vendors`}
                    >
                      <div className="w-full bg-cyan-400" style={{ height: `${hCust}px`, minHeight: cust > 0 ? 2 : 0 }} />
                      <div className="w-full rounded-b-sm bg-fuchsia-500" style={{ height: `${hVend}px`, minHeight: vend > 0 ? 2 : 0 }} />
                    </div>
                    <div className="text-center text-[10px] text-slate-500">{label}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-cyan-400" /> Customers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-fuchsia-500" /> Vendors
              </span>
            </div>
          </ChartCard>

          <ChartCard title="Revenue trend" subtitle="Gross order value booked per month (platform GMV)">
            <div className="mt-3 flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 120 }}>
              {(trends.monthlyOrders || []).slice(-12).map((m) => {
                const rev = Number(m.revenueCents || 0);
                const h = Math.max(6, Math.round((rev / maxRevenue) * 100));
                const label = m.month && m.month.length >= 7 ? m.month.slice(5) : m.month;
                return (
                  <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="flex h-[104px] w-full items-end justify-center rounded-t bg-emerald-950/40"
                      title={`${money(rev)} · ${m.month}`}
                    >
                      <div className="w-full rounded-t bg-emerald-400" style={{ height: `${h}px` }} />
                    </div>
                    <div className="text-center text-[10px] text-slate-500">{label}</div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Order activity" subtitle="Number of orders placed per month">
            <div className="mt-3 flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 120 }}>
              {(trends.monthlyOrders || []).slice(-12).map((m) => {
                const cnt = Number(m.count || 0);
                const h = Math.max(6, Math.round((cnt / maxOrders) * 100));
                const label = m.month && m.month.length >= 7 ? m.month.slice(5) : m.month;
                return (
                  <div key={`o-${m.month}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="flex h-[104px] w-full items-end justify-center rounded-t bg-indigo-950/40"
                      title={`${cnt} orders · ${m.month}`}
                    >
                      <div className="w-full rounded-t bg-indigo-400" style={{ height: `${h}px` }} />
                    </div>
                    <div className="text-center text-[10px] text-slate-500">{label}</div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Listing catalog growth" subtitle="New listings created per month">
            <div className="mt-3 flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 120 }}>
              {(trends.monthlyListings || []).slice(-12).map((m) => {
                const cnt = Number(m.count || 0);
                const h = Math.max(6, Math.round((cnt / maxListings) * 100));
                const label = m.month && m.month.length >= 7 ? m.month.slice(5) : m.month;
                return (
                  <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="flex h-[104px] w-full items-end justify-center rounded-t bg-amber-950/30"
                      title={`${cnt} listings · ${m.month}`}
                    >
                      <div className="w-full rounded-t bg-amber-400" style={{ height: `${h}px` }} />
                    </div>
                    <div className="text-center text-[10px] text-slate-500">{label}</div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-slate-900/50 p-5">
        <h2 className="text-sm font-semibold text-white">Quick navigation</h2>
        <p className="mt-1 text-xs text-slate-400">Jump to common admin workflows.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/admin/orders" label="Orders" desc="Status, messages, issues" />
          <QuickLink to="/admin/listings" label="Listings" desc="Moderation queue" />
          <QuickLink to="/admin/vendors" label="Vendors" desc="Accounts & verification" />
          <QuickLink to="/admin/customers" label="Customers" desc="Directory & blocks" />
          <QuickLink to="/admin/products" label="Products" desc="Bulk & search" />
          <QuickLink to="/admin/catalog" label="Categories" desc="Categories & brands" />
          <QuickLink to="/admin/payments" label="Payments" desc="Refunds & payouts" />
          <QuickLink to="/admin/contact-messages" label="Contact" desc="Inbox" />
          <QuickLink to="/admin/reviews" label="Reviews" desc="Moderation" />
          <QuickLink to="/admin/promotions" label="Promotions" desc="Global deals" />
          <QuickLink to="/admin/shipping" label="Shipping" desc="Rates & rules" />
          <QuickLink to="/admin/settings" label="Settings" desc="Platform config" />
        </div>
      </div>
    </div>
  );
}

function normalizeDashboard(raw) {
  const counters = raw?.counters || {};
  const trends = raw?.trends || {};
  /** Legacy API shape */
  const legacyUsers = trends.monthlyUsers;
  const legacyOrders = trends.monthlyOrders;
  return {
    counters: {
      totalCustomers: counters.totalCustomers ?? 0,
      totalVendors: counters.totalVendors ?? 0,
      totalAdmins: counters.totalAdmins ?? 0,
      totalMembers: counters.totalMembers ?? (counters.totalCustomers ?? 0) + (counters.totalVendors ?? 0) + (counters.totalAdmins ?? 0),
      totalOrders: counters.totalOrders ?? 0,
      totalListings: counters.totalListings ?? 0,
      activeListings: counters.activeListings ?? 0,
      pendingListings: counters.pendingListings ?? 0,
      platformRevenueCents: counters.platformRevenueCents ?? 0,
    },
    trends: {
      monthlyUserGrowth: Array.isArray(trends.monthlyUserGrowth)
        ? trends.monthlyUserGrowth
        : Array.isArray(legacyUsers)
          ? legacyUsers.map((row) => ({
              month: row.month,
              count: row.count,
              customers: row.count,
              vendors: 0,
            }))
          : [],
      monthlyOrders: Array.isArray(trends.monthlyOrders) ? trends.monthlyOrders : Array.isArray(legacyOrders) ? legacyOrders : [],
      monthlyListings: Array.isArray(trends.monthlyListings) ? trends.monthlyListings : [],
    },
  };
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-lg ${
        accent
          ? "border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 to-slate-900"
          : "border-white/20 bg-gradient-to-br from-slate-900 via-indigo-900/80 to-slate-900"
      }`}
    >
      <div className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-emerald-200" : "text-cyan-200"}`}>{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-slate-400">{sub}</div> : null}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">{title}</div>
      {subtitle ? <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p> : null}
      {children}
    </div>
  );
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
    >
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="mt-0.5 text-xs text-slate-400">{desc}</div>
    </Link>
  );
}
