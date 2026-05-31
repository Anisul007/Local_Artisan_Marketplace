import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AdminAPI } from "../../lib/api";

const money = (cents, currency = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format((Number(cents) || 0) / 100);

const METRIC_LINKS = {
  users: { path: "users", label: "User growth", color: "purple" },
  revenue: { path: "revenue", label: "Revenue trend", color: "emerald" },
  orders: { path: "orders", label: "Order activity", color: "purple" },
  listings: { path: "listings", label: "Listing catalog growth", color: "amber" },
};

function pctBadge(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return <span className="text-gray-500">—</span>;
  const up = v > 0;
  return (
    <span className={up ? "text-emerald-700" : "text-rose-700"}>
      {up ? "+" : ""}
      {v}% vs prior month
    </span>
  );
}

export default function AdminAnalyticsDetailPage() {
  const { metric: metricParam } = useParams();
  const metric = String(metricParam || "").toLowerCase();
  const meta = METRIC_LINKS[metric];

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meta) {
      setErr("Unknown analytics module");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    AdminAPI.analyticsDetail(metric, { months: 24 })
      .then((r) => {
        if (cancelled) return;
        if (!r?.ok) {
          setErr(r?.data?.message || "Could not load analytics");
          setData(null);
          return;
        }
        setData(r?.data?.data ?? r?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setErr("Could not load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metric, meta]);

  if (!meta) {
    return (
      <div className="admin-card">
        <p className="text-red-700">{err || "Invalid analytics page."}</p>
        <Link to="/admin/dashboard" className="mt-3 inline-flex text-sm font-semibold text-[#4b0082] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-medium text-gray-600">Platform analytics</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-900">{data?.title || meta.label}</span>
      </div>

      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-[#4b0082]/10 via-white to-[#ff6600]/10 p-5">
        <h1 className="text-2xl font-black text-gray-900">{data?.title || meta.label}</h1>
        <p className="mt-1 text-sm text-gray-600">Full platform breakdown — up to 24 months of history, status splits, and recent activity.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(METRIC_LINKS).map(([key, m]) => (
            <Link
              key={key}
              to={`/admin/analytics/${m.path}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                key === metric ? "bg-[#4b0082] text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-purple-50"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </div>
      </div>

      {loading && <div className="admin-card h-48 animate-pulse rounded-xl bg-gray-100" />}
      {err && !loading && <div className="admin-card text-sm text-red-700">{err}</div>}

      {!loading && !err && data && (
        <>
          {metric === "users" && <UsersAnalytics data={data} />}
          {metric === "revenue" && <RevenueAnalytics data={data} />}
          {metric === "orders" && <OrdersAnalytics data={data} />}
          {metric === "listings" && <ListingsAnalytics data={data} />}
        </>
      )}
    </div>
  );
}

function SummaryGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</div>
          <div className="mt-1 text-xl font-black tabular-nums text-gray-900">{item.value}</div>
          {item.sub ? <div className="mt-1 text-[11px] text-gray-500">{item.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

function MonthlyTable({ columns, rows }) {
  return (
    <div className="admin-card overflow-x-auto">
      <h2 className="admin-card-title text-base">Monthly breakdown</h2>
      <table className="mt-4 w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            {columns.map((c) => (
              <th key={c.key} className="px-2 py-2 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-2 py-6 text-gray-500">
                No data yet.
              </td>
            </tr>
          ) : (
            [...rows].reverse().map((row) => (
              <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50/80">
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-2.5 tabular-nums text-gray-800">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function BreakdownTable({ title, rows, labelKey = "status", countKey = "count" }) {
  const total = rows.reduce((n, r) => n + (Number(r[countKey]) || 0), 0);
  return (
    <div className="admin-card">
      <h2 className="admin-card-title text-base">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const count = Number(r[countKey]) || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={r[labelKey] || r.status} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 capitalize font-medium text-gray-800">{r[labelKey] || r.status || "—"}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[#4b0082]" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right tabular-nums text-gray-600">{count}</span>
              <span className="w-10 shrink-0 text-right text-xs text-gray-400">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UsersAnalytics({ data }) {
  const s = data.summary || {};
  const monthly = data.monthly || [];
  const maxTotal = useMemo(() => Math.max(1, ...monthly.map((m) => Number(m.total || 0))), [monthly]);

  return (
    <>
      <SummaryGrid
        items={[
          { label: "Total customers", value: s.totalCustomers ?? 0, sub: `${s.verifiedCustomers ?? 0} verified` },
          { label: "Total vendors", value: s.totalVendors ?? 0, sub: `${s.verifiedVendors ?? 0} verified` },
          { label: "New last month", value: s.lastMonthNew ?? 0, sub: pctBadge(s.momGrowthPct) },
          { label: "Unverified accounts", value: (s.unverifiedCustomers ?? 0) + (s.unverifiedVendors ?? 0), sub: "Customers + vendors" },
        ]}
      />

      <ChartPanel title="New sign-ups per month">
        <div className="flex items-end gap-2" style={{ minHeight: 200 }}>
          {monthly.map((m) => {
            const cust = Number(m.customers || 0);
            const vend = Number(m.vendors || 0);
            const total = cust + vend;
            const hTotal = Math.max(8, Math.round((total / maxTotal) * 180));
            const hCust = total > 0 ? Math.round((cust / total) * hTotal) : 0;
            const hVend = Math.max(0, hTotal - hCust);
            return (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="flex w-full max-w-[48px] flex-col justify-end rounded-t bg-purple-50 sm:max-w-none"
                  style={{ height: 200 }}
                  title={`${m.monthLabel}: ${cust} customers, ${vend} vendors`}
                >
                  <div className="w-full bg-[#4b0082]" style={{ height: `${hCust}px`, minHeight: cust > 0 ? 2 : 0 }} />
                  <div className="w-full bg-[#ff6600]" style={{ height: `${hVend}px`, minHeight: vend > 0 ? 2 : 0 }} />
                </div>
                <span className="text-[10px] text-gray-500">{m.month?.slice(5) || m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-[#4b0082]" /> Customers</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-[#ff6600]" /> Vendors</span>
        </div>
      </ChartPanel>

      <MonthlyTable
        columns={[
          { key: "month", label: "Month", render: (r) => r.monthLabel || r.month },
          { key: "customers", label: "Customers" },
          { key: "vendors", label: "Vendors" },
          { key: "total", label: "Total new" },
          { key: "cumulative", label: "Running total" },
        ]}
        rows={monthly}
      />

      <RecentSignups items={data.recentSignups || []} />
    </>
  );
}

function RevenueAnalytics({ data }) {
  const s = data.summary || {};
  const monthly = data.monthly || [];
  const maxRev = useMemo(() => Math.max(1, ...monthly.map((m) => Number(m.revenueCents || 0))), [monthly]);

  return (
    <>
      <SummaryGrid
        items={[
          { label: "Lifetime GMV", value: money(s.totalRevenueCents), sub: `${s.totalOrders ?? 0} orders` },
          { label: "Avg order value", value: money(s.avgOrderValueCents) },
          { label: "Last month GMV", value: money(s.lastMonthRevenueCents), sub: pctBadge(s.momRevenueGrowthPct) },
          { label: "Best month", value: s.bestMonth ? monthShort(s.bestMonth) : "—", sub: money(s.bestMonthRevenueCents) },
        ]}
      />

      <ChartPanel title="Gross merchandise value by month">
        <div className="flex items-end gap-2" style={{ minHeight: 200 }}>
          {monthly.map((m) => {
            const rev = Number(m.revenueCents || 0);
            const h = Math.max(8, Math.round((rev / maxRev) * 180));
            return (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-[200px] w-full items-end justify-center rounded-t bg-emerald-50" title={money(rev)}>
                  <div className="w-full max-w-[48px] rounded-t bg-emerald-600 sm:max-w-none" style={{ height: `${h}px` }} />
                </div>
                <span className="text-[10px] text-gray-500">{m.month?.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </ChartPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <MonthlyTable
          columns={[
            { key: "month", label: "Month", render: (r) => r.monthLabel || r.month },
            { key: "count", label: "Orders" },
            { key: "revenueCents", label: "GMV", render: (r) => money(r.revenueCents) },
            { key: "avgOrderValueCents", label: "AOV", render: (r) => money(r.avgOrderValueCents) },
            { key: "discountCents", label: "Discounts", render: (r) => money(r.discountCents || 0) },
          ]}
          rows={monthly}
        />
        <BreakdownTable title="Revenue by order status" rows={data.statusBreakdown || []} />
      </div>

      <RecentOrders items={data.recentOrders || []} />
    </>
  );
}

function OrdersAnalytics({ data }) {
  const s = data.summary || {};
  const monthly = data.monthly || [];
  const maxCnt = useMemo(() => Math.max(1, ...monthly.map((m) => Number(m.count || 0))), [monthly]);

  return (
    <>
      <SummaryGrid
        items={[
          { label: "Total orders", value: s.totalOrders ?? 0 },
          { label: "Completed", value: s.completedOrders ?? 0, sub: `${s.completionRatePct ?? 0}% completion rate` },
          { label: "Cancelled / rejected", value: s.cancelledOrRejected ?? 0 },
          { label: "Last month", value: s.lastMonthOrders ?? 0, sub: pctBadge(s.momOrderGrowthPct) },
        ]}
      />

      <ChartPanel title="Orders placed per month">
        <div className="flex items-end gap-2" style={{ minHeight: 200 }}>
          {monthly.map((m) => {
            const cnt = Number(m.count || 0);
            const h = Math.max(8, Math.round((cnt / maxCnt) * 180));
            return (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-[200px] w-full items-end justify-center rounded-t bg-purple-50" title={`${cnt} orders`}>
                  <div className="w-full max-w-[48px] rounded-t bg-[#4b0082] sm:max-w-none" style={{ height: `${h}px` }} />
                </div>
                <span className="text-[10px] text-gray-500">{m.month?.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </ChartPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <MonthlyTable
          columns={[
            { key: "month", label: "Month", render: (r) => r.monthLabel || r.month },
            { key: "count", label: "Orders" },
            { key: "completed", label: "Completed" },
            { key: "cancelled", label: "Cancelled / rejected" },
            { key: "completionRate", label: "Completion %", render: (r) => `${r.completionRate ?? 0}%` },
            { key: "revenueCents", label: "GMV", render: (r) => money(r.revenueCents) },
          ]}
          rows={monthly}
        />
        <BreakdownTable title="Orders by status" rows={data.statusBreakdown || []} />
      </div>

      <RecentOrders items={data.recentOrders || []} showItems />
    </>
  );
}

function ListingsAnalytics({ data }) {
  const s = data.summary || {};
  const monthly = data.monthly || [];
  const maxCnt = useMemo(() => Math.max(1, ...monthly.map((m) => Number(m.count || 0))), [monthly]);

  return (
    <>
      <SummaryGrid
        items={[
          { label: "Total listings", value: s.totalListings ?? 0 },
          { label: "Active", value: s.activeListings ?? 0 },
          { label: "Pending moderation", value: s.pendingListings ?? 0, sub: <Link to="/admin/listings" className="text-[#4b0082] hover:underline">Review queue</Link> },
          { label: "New last month", value: s.lastMonthNew ?? 0, sub: pctBadge(s.momListingGrowthPct) },
        ]}
      />

      <ChartPanel title="New listings per month">
        <div className="flex items-end gap-2" style={{ minHeight: 200 }}>
          {monthly.map((m) => {
            const cnt = Number(m.count || 0);
            const h = Math.max(8, Math.round((cnt / maxCnt) * 180));
            return (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-[200px] w-full items-end justify-center rounded-t bg-amber-50" title={`${cnt} listings`}>
                  <div className="w-full max-w-[48px] rounded-t bg-amber-500 sm:max-w-none" style={{ height: `${h}px` }} />
                </div>
                <span className="text-[10px] text-gray-500">{m.month?.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </ChartPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <MonthlyTable
          columns={[
            { key: "month", label: "Month", render: (r) => r.monthLabel || r.month },
            { key: "count", label: "New listings" },
          ]}
          rows={monthly}
        />
        <div className="space-y-5">
          <BreakdownTable title="Moderation status" rows={(data.moderationBreakdown || []).map((r) => ({ status: r.status, count: r.count }))} />
          <BreakdownTable title="Inventory status" rows={(data.inventoryBreakdown || []).map((r) => ({ status: r.status, count: r.count }))} />
        </div>
      </div>

      <RecentListings items={data.recentListings || []} />
    </>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="admin-card">
      <h2 className="admin-card-title text-base">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RecentSignups({ items }) {
  return (
    <div className="admin-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="admin-card-title text-base">Recent sign-ups</h2>
        <Link to="/admin/customers" className="text-xs font-semibold text-[#4b0082] hover:underline">
          All customers
        </Link>
        <Link to="/admin/vendors" className="text-xs font-semibold text-[#4b0082] hover:underline">
          All vendors
        </Link>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Role</th>
              <th className="py-2 pr-2">Verified</th>
              <th className="py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="py-2 pr-2">
                  <Link to={`/admin/users/${u.id}`} className="font-medium text-[#4b0082] hover:underline">
                    {u.name}
                  </Link>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="py-2 pr-2 capitalize">{u.role}</td>
                <td className="py-2 pr-2">{u.isVerified ? "Yes" : "No"}</td>
                <td className="py-2 text-gray-600">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentOrders({ items, showItems = false }) {
  return (
    <div className="admin-card">
      <div className="flex items-center justify-between">
        <h2 className="admin-card-title text-base">Recent orders</h2>
        <Link to="/admin/orders" className="text-xs font-semibold text-[#4b0082] hover:underline">
          Open order management
        </Link>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Order</th>
              <th className="py-2 pr-2">Customer</th>
              <th className="py-2 pr-2">Total</th>
              {showItems ? <th className="py-2 pr-2">Items</th> : null}
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b border-gray-100">
                <td className="py-2 pr-2 font-medium text-gray-900">{o.orderNumber}</td>
                <td className="py-2 pr-2 text-gray-700">{o.customerName}</td>
                <td className="py-2 pr-2 tabular-nums">{money(o.totalCents, o.currency)}</td>
                {showItems ? <td className="py-2 pr-2 tabular-nums">{o.itemCount ?? "—"}</td> : null}
                <td className="py-2 pr-2 capitalize">{o.status}</td>
                <td className="py-2 text-gray-600">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentListings({ items }) {
  return (
    <div className="admin-card">
      <div className="flex items-center justify-between">
        <h2 className="admin-card-title text-base">Recent listings</h2>
        <Link to="/admin/products" className="text-xs font-semibold text-[#4b0082] hover:underline">
          Product management
        </Link>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Title</th>
              <th className="py-2 pr-2">Vendor</th>
              <th className="py-2 pr-2">Moderation</th>
              <th className="py-2 pr-2">Inventory</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 pr-2 font-medium text-gray-900">{l.title}</td>
                <td className="py-2 pr-2 text-gray-700">{l.vendorName}</td>
                <td className="py-2 pr-2 capitalize">{l.moderationStatus}</td>
                <td className="py-2 pr-2 capitalize">{l.inventoryStatus}</td>
                <td className="py-2 text-gray-600">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function monthShort(ym) {
  if (!ym || ym.length < 7) return ym;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = parseInt(ym.slice(5, 7), 10) - 1;
  return mi >= 0 ? `${names[mi]} ${ym.slice(0, 4)}` : ym;
}
