import { useEffect, useMemo, useState } from "react";
import SimpleLineChart from "../../components/vendor/SimpleLineChart";
import { API, VendorOrdersAPI } from "../../lib/api";

const money = (cents, currency = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format((Number(cents) || 0) / 100);

export default function SalesInsightsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [analytics, setAnalytics] = useState({
    totalRevenueCents: 0,
    completedOrders: 0,
    estimatedProfitCents: 0,
    monthlySales: [],
    bestSellers: [],
    weeklyTrend: [],
  });
  const [issues, setIssues] = useState([]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [aRes, iRes] = await Promise.all([
        VendorOrdersAPI.analytics({ from, to }),
        VendorOrdersAPI.issues({}),
      ]);
      if (!aRes?.ok) throw new Error(aRes?.data?.message || "Could not load analytics");
      setAnalytics(aRes?.data?.data || aRes?.data || {});
      if (iRes?.ok) {
        const payload = iRes?.data?.data ?? iRes?.data ?? {};
        setIssues(Array.isArray(payload?.issues) ? payload.issues : []);
      }
    } catch (e) {
      setErr(e?.message || "Could not load insights");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxRevenue = useMemo(
    () => Math.max(1, ...(analytics?.monthlySales || []).map((m) => Number(m?.revenueCents || 0))),
    [analytics]
  );

  const orderSeries = useMemo(
    () =>
      (analytics?.weeklyTrend || []).map((d) => ({
        label: d.label,
        value: Number(d.orders) || 0,
      })),
    [analytics?.weeklyTrend]
  );
  const revenueSeries = useMemo(
    () =>
      (analytics?.weeklyTrend || []).map((d) => ({
        label: d.label,
        value: Number(d.revenueCents) || 0,
      })),
    [analytics?.weeklyTrend]
  );

  const csvUrl = `${API}/api/vendor/reports/export?format=csv${from ? `&from=${encodeURIComponent(from)}` : ""}${to ? `&to=${encodeURIComponent(to)}` : ""}`;
  const pdfUrl = `${API}/api/vendor/reports/export?format=pdf${from ? `&from=${encodeURIComponent(from)}` : ""}${to ? `&to=${encodeURIComponent(to)}` : ""}`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Sales Insights</h1>
            <p className="mt-1 text-sm text-gray-600">Track revenue, profit estimate, best sellers, and export reports.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-gray-600">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
              />
            </label>
            <label className="text-xs text-gray-600">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Revenue" value={money(analytics.totalRevenueCents)} />
        <Kpi label="Completed orders" value={analytics.completedOrders || 0} />
        <Kpi label="Estimated profit" value={money(analytics.estimatedProfitCents)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Weekly order trend</h2>
          <p className="mt-1 text-xs text-gray-500">Orders per day for the last 7 days (excludes cancelled/rejected).</p>
          <div className="mt-3">
            <SimpleLineChart
              series={orderSeries}
              stroke="#4f46e5"
              formatValue={(v) => `${v} order${v === 1 ? "" : "s"}`}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Weekly revenue trend</h2>
          <p className="mt-1 text-xs text-gray-500">Your line-item revenue per day for the last 7 days.</p>
          <div className="mt-3">
            <SimpleLineChart
              series={revenueSeries}
              stroke="#059669"
              formatValue={(cents) => money(cents)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Monthly Sales Trend</h2>
          <div className="mt-4 grid grid-cols-6 gap-2 md:grid-cols-12">
            {(analytics?.monthlySales || []).map((m) => {
              const h = Math.max(8, Math.round((Number(m.revenueCents || 0) / maxRevenue) * 120));
              return (
                <div key={m.month} className="flex flex-col items-center justify-end gap-1">
                  <div className="w-full rounded bg-indigo-100" style={{ height: `${h}px` }}>
                    <div className="h-full w-full rounded bg-indigo-500" />
                  </div>
                  <div className="text-[10px] text-gray-500">{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Export Reports</h2>
          <p className="mt-1 text-xs text-gray-500">Download filtered report as CSV or PDF.</p>
          <div className="mt-3 space-y-2">
            <a href={csvUrl} className="block rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Download CSV
            </a>
            <a href={pdfUrl} className="block rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Best-Selling Products</h2>
          <div className="mt-3 space-y-2">
            {(analytics.bestSellers || []).length === 0 ? (
              <p className="text-sm text-gray-500">No completed sales yet.</p>
            ) : (
              (analytics.bestSellers || []).map((p) => (
                <div key={p.title} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <div className="font-medium text-gray-900">{p.title}</div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{p.units} units</div>
                    <div className="text-xs text-gray-500">{money(p.revenueCents)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Reported Issues</h2>
          <p className="mt-1 text-xs text-gray-500">Stored for admin review and tracking.</p>
          <div className="mt-3 space-y-2">
            {issues.length === 0 ? (
              <p className="text-sm text-gray-500">No issues reported yet.</p>
            ) : (
              issues.slice(0, 8).map((i) => (
                <div key={i._id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">{i.orderNumber}</div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{i.issueStatus}</span>
                  </div>
                  <p className="mt-1 text-gray-600">{i.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
