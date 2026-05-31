import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
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
    if (notify.pendingPromotions > 0)
      items.push({ label: "Vendor promotions awaiting approval", value: notify.pendingPromotions, to: "/admin/promotions", tone: "amber" });
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
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-[#4b0082] to-[#ff6600] p-5 text-white shadow-xl shadow-purple-900/20">
        <h1 className="text-2xl font-black tracking-tight">Platform command center</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/90">
          Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}. Monitor member growth, catalog size, order volume, and
          gross merchandise value — with trends that refresh automatically.
        </p>
      </div>

      {attentionItems.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#ff6600]">Needs attention</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-sm hover:border-[#4b0082]/30 hover:bg-purple-50"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-[#4b0082] px-2 py-0.5 tabular-nums text-white">{item.value}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Customers" value={c.totalCustomers} sub="Registered buyers" />
        <Kpi label="Vendors" value={c.totalVendors} sub="Seller accounts" />
        <Kpi label="Total members" value={c.totalMembers} sub="Customers + vendors + admins" />
        <Kpi label="Listings" value={c.totalListings} sub={`${c.activeListings || 0} active`} />
        <Kpi label="Orders" value={c.totalOrders} sub="All time" />
        <Kpi label="Platform GMV" value={money(c.platformRevenueCents)} sub="Sum of order totals" accent />
      </div>

      {c.pendingListings > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-gray-700">
          <span>
            <strong className="text-[#4b0082]">{c.pendingListings}</strong> listing(s) pending moderation
          </span>
          <Link to="/admin/listings" className="rounded-lg bg-[#4b0082] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
            Review queue
          </Link>
        </div>
      )}

      <div className="admin-card shadow-black/20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Platform analytics</h2>
            <p className="mt-1 text-xs text-gray-500">
              User growth (new customers & vendors), listing volume, orders, and revenue by month.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-gray-600">
              Report from
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block h-9 rounded-lg border border-gray-200 bg-white px-2 text-gray-900"
              />
            </label>
            <label className="text-xs text-gray-600">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block h-9 rounded-lg border border-gray-200 bg-white px-2 text-gray-900"
              />
            </label>
            <a
              href={reportCsv}
              className="admin-btn admin-btn-sm admin-btn-outline h-9"
            >
              Export CSV
            </a>
            <a
              href={reportPdf}
              className="admin-btn admin-btn-sm admin-btn-outline h-9"
            >
              Export PDF
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ChartCard to="/admin/analytics/users" title="User growth" subtitle="New customers & vendors per month (excludes admin accounts)">
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
                      className="flex h-[104px] w-full max-w-[40px] flex-col justify-end rounded-t bg-purple-100 sm:max-w-none"
                      title={`${m.month}: ${cust} customers, ${vend} vendors`}
                    >
                      <div className="w-full bg-[#4b0082]" style={{ height: `${hCust}px`, minHeight: cust > 0 ? 2 : 0 }} />
                      <div className="w-full rounded-b-sm bg-[#ff6600]" style={{ height: `${hVend}px`, minHeight: vend > 0 ? 2 : 0 }} />
                    </div>
                    <div className="text-center text-[10px] text-gray-500">{label}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#4b0082]" /> Customers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#ff6600]" /> Vendors
              </span>
            </div>
          </ChartCard>

          <ChartCard to="/admin/analytics/revenue" title="Revenue trend" subtitle="Gross order value booked per month (platform GMV)">
            <div className="mt-3 flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 120 }}>
              {(trends.monthlyOrders || []).slice(-12).map((m) => {
                const rev = Number(m.revenueCents || 0);
                const h = Math.max(6, Math.round((rev / maxRevenue) * 100));
                const label = m.month && m.month.length >= 7 ? m.month.slice(5) : m.month;
                return (
                  <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="flex h-[104px] w-full items-end justify-center rounded-t bg-emerald-100"
                      title={`${money(rev)} · ${m.month}`}
                    >
                      <div className="w-full rounded-t bg-emerald-600" style={{ height: `${h}px` }} />
                    </div>
                    <div className="text-center text-[10px] text-gray-500">{label}</div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard to="/admin/analytics/orders" title="Order activity" subtitle="Number of orders placed per month">
            <div className="mt-3 flex items-end gap-1.5 sm:gap-2" style={{ minHeight: 120 }}>
              {(trends.monthlyOrders || []).slice(-12).map((m) => {
                const cnt = Number(m.count || 0);
                const h = Math.max(6, Math.round((cnt / maxOrders) * 100));
                const label = m.month && m.month.length >= 7 ? m.month.slice(5) : m.month;
                return (
                  <div key={`o-${m.month}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="flex h-[104px] w-full items-end justify-center rounded-t bg-purple-100"
                      title={`${cnt} orders · ${m.month}`}
                    >
                      <div className="w-full rounded-t bg-[#4b0082]" style={{ height: `${h}px` }} />
                    </div>
                    <div className="text-center text-[10px] text-gray-500">{label}</div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard to="/admin/analytics/listings" title="Listing catalog growth" subtitle="New listings created per month">
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
                    <div className="text-center text-[10px] text-gray-500">{label}</div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
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
      className={`min-w-0 rounded-xl border p-4 shadow-sm ${
        accent
          ? "border-orange-200 bg-gradient-to-br from-orange-50 to-white"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-[#ff6600]" : "text-[#4b0082]"}`}>{label}</div>
      <div className="mt-1 text-xl font-black tabular-nums leading-tight tracking-tight text-gray-900 sm:text-2xl">{value}</div>
      {sub ? <div className="mt-1 text-[11px] text-gray-500">{sub}</div> : null}
    </div>
  );
}

function ChartCard({ title, subtitle, children, to }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</div>
          {subtitle ? <p className="mt-1 text-[11px] text-gray-500">{subtitle}</p> : null}
        </div>
        {to ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[#4b0082] group-hover:underline">
            View details <ChevronRight className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      {children}
    </>
  );

  if (!to) {
    return <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">{inner}</div>;
  }

  return (
    <Link
      to={to}
      className="group block rounded-xl border border-gray-200 bg-gray-50/80 p-4 transition hover:border-[#4b0082]/35 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4b0082]/40"
    >
      {inner}
    </Link>
  );
}
