import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaStore, FaBoxOpen, FaShoppingBag, FaTruck, FaChartLine, FaTag, FaCog, FaBell, FaSearch, FaPlus, FaExternalLinkAlt, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaEdit } from "react-icons/fa";
import { apiGet } from "../lib/api"; // uses fetch with credentials already

/**
 * VendorDashboard.jsx — DATA‑DRIVEN version
 * ---------------------------------------------------------------------------
 * - Fetches all content from your backend (see endpoints below)
 * - No hardcoded data; shows graceful empty states when DB has no data
 * - Tailwind only; no chart libs. Uses tiny SVG sparkline for performance.
 * - Add/adjust endpoints to match your server. Each section handles loading/empty/error.
 *
 * Expected endpoints (adjust names/paths to your API):
 *   GET /api/vendor/summary         -> { revenueToday:number, orders:number, conversion:number, aov:number, revenueSeries:number[] }
 *   GET /api/vendor/products?limit= -> [{ _id, sku, name, price, stock, sold, imageUrl }]
 *   GET /api/vendor/low-stock       -> [{ _id, sku, name, stock }]
 *   GET /api/vendor/orders?limit=   -> [{ _id, code, customerName, total, status, placedAt }]
 *   GET /api/vendor/inbox?limit=    -> [{ _id, from, preview, time }]
 *   GET /api/vendor/alerts?limit=   -> [{ _id, kind:"warning"|"info"|"success", text }]
 *   GET /api/vendor/promotions      -> [{ _id, code, name, active, discountPct }]
 *
 * If your actual endpoints differ, just change the URLs in loadData().
 */

const currency = (n) => typeof n === "number" ? new Intl.NumberFormat(undefined, { style: "currency", currency: "AUD" }).format(n) : "—";

const StatusPill = ({ type }) => {
  const palette = {
    paid: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    cancelled: "bg-rose-100 text-rose-700 border-rose-200",
    shipped: "bg-blue-100 text-blue-700 border-blue-200",
    processing: "bg-purple-100 text-purple-700 border-purple-200",
  };
  const label = (type || "").toString();
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${palette[type] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        type === "paid" ? "bg-green-500" :
        type === "pending" ? "bg-amber-500" :
        type === "cancelled" ? "bg-rose-500" :
        type === "shipped" ? "bg-blue-500" :
        type === "processing" ? "bg-purple-500" : "bg-gray-400"
      }`} />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
};

const TinyArea = ({ points }) => {
  // Simple sparkline/area chart (0..max)
  if (!Array.isArray(points) || points.length === 0) return <div className="h-10 w-full" />;
  const max = Math.max(...points, 1);
  const d = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-10 w-full">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500" />
      <polygon points={`0,100 ${d} 100,100`} className="fill-indigo-100" />
    </svg>
  );
};

const SectionCard = ({ title, action, children }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const LoadingRow = () => (
  <tr className="animate-pulse">
    <td className="px-3 py-3" colSpan={6}>
      <div className="h-3 w-full rounded bg-gray-200" />
    </td>
  </tr>
);

const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="grid place-items-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
    <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white text-indigo-600 shadow">{icon}</div>
    <div className="text-lg font-bold text-gray-900">{title}</div>
    {subtitle && <div className="mt-1 text-sm text-gray-600">{subtitle}</div>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export default function VendorDashboard() {
  const abortRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [promos, setPromos] = useState([]);

  async function loadData() {
    setLoading(true);
    setError("");

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fire requests in parallel. Replace URLs to match your backend exactly.
      const [s, p, ls, o, ib, al, pr] = await Promise.all([
        apiGet("/api/vendor/summary"),
        apiGet("/api/vendor/products?limit=12"),
        apiGet("/api/vendor/low-stock"),
        apiGet("/api/vendor/orders?limit=10"),
        apiGet("/api/vendor/inbox?limit=5"),
        apiGet("/api/vendor/alerts?limit=5"),
        apiGet("/api/vendor/promotions"),
      ]);

      if (s.ok) setSummary(s);
      if (p.ok) setProducts(Array.isArray(p) ? p : p.items || []);
      else if (p.items) setProducts(p.items);

      if (ls.ok) setLowStock(Array.isArray(ls) ? ls : ls.items || []);
      if (o.ok) setOrders(Array.isArray(o) ? o : o.items || []);
      if (ib.ok) setInbox(Array.isArray(ib) ? ib : ib.items || []);
      if (al.ok) setAlerts(Array.isArray(al) ? al : al.items || []);
      if (pr.ok) setPromos(Array.isArray(pr) ? pr : pr.items || []);
    } catch (err) {
      if (err?.name !== "AbortError") setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    return () => abortRef.current?.abort();
  }, []);

  const kpis = useMemo(() => ([
    { label: "Revenue (Today)", value: summary?.revenueToday, money: true, icon: <FaChartLine /> },
    { label: "Orders", value: summary?.orders, icon: <FaShoppingBag /> },
    { label: "Conversion", value: typeof summary?.conversion === "number" ? `${summary.conversion.toFixed(1)}%` : summary?.conversion, icon: <FaStore /> },
    { label: "Avg. Order Value", value: summary?.aov, money: true, icon: <FaTag /> },
  ]), [summary]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-3 text-indigo-600">
            <FaStore className="h-5 w-5" />
            <span className="font-extrabold tracking-tight">Vendor Dashboard</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden sm:block">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search orders, products..."
                className="h-9 w-64 rounded-full border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
              <FaBell />
              Alerts
            </button>
            <Link
              to="/vendor/products/new"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <FaPlus /> New Product
            </Link>
            <a
              href="/"
              className="hidden items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 sm:inline-flex"
            >
              <FaExternalLinkAlt /> View Storefront
            </a>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <nav className="sticky top-[4.25rem] space-y-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            {[
              { icon: <FaChartLine />, label: "Overview", href: "/vendor/dashboard" },
              { icon: <FaShoppingBag />, label: "Orders", href: "#orders" },
              { icon: <FaBoxOpen />, label: "Products", href: "#products" },
              { icon: <FaTruck />, label: "Inventory", href: "#inventory" },
              { icon: <FaTag />, label: "Promotions", href: "#promotions" },
              { icon: <FaCog />, label: "Settings", href: "#settings" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <span className="text-gray-400 group-hover:text-indigo-600">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          {/* Alerts */}
          <div className="mt-4 space-y-2">
            {loading && (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-gray-200" />
              </div>
            )}
            {!loading && alerts?.length === 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="text-sm text-gray-600">No alerts.</div>
              </div>
            )}
            {!loading && alerts?.length > 0 && alerts.map((a) => (
              <div key={a._id} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="mt-0.5 text-amber-500"><FaExclamationTriangle /></div>
                <div className="text-sm text-gray-800">{a.text}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <section className="lg:col-span-9 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{k.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-gray-900">
                      {typeof k.value === "number" && k.money ? currency(k.value) :
                       typeof k.value === "number" && !k.money ? k.value : (k.value ?? "—")}
                    </p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    {k.icon}
                  </div>
                </div>
                <div className="mt-2">
                  <TinyArea points={summary?.revenueSeries || []} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Revenue */}
          <SectionCard title="Revenue" action={<button onClick={loadData} className="text-sm font-semibold text-indigo-700 hover:underline">Refresh</button>}>
            {loading && <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />}
            {!loading && (!summary || !summary?.revenueSeries?.length) && (
              <EmptyState icon={<FaChartLine />} title="No revenue data yet" subtitle="Your sales chart will appear here once orders are placed." />
            )}
            {!loading && summary?.revenueSeries?.length > 0 && (
              <div className="relative h-48 w-full">
                <TinyArea points={summary.revenueSeries} />
                <div className="mt-2 text-xs text-gray-500">Daily totals · inc GST</div>
              </div>
            )}
          </SectionCard>

          {/* Orders */}
          <SectionCard title="Recent Orders" action={<Link to="#orders" className="text-sm font-semibold text-indigo-700 hover:underline">View all</Link>}>
            {loading && (
              <table className="min-w-full text-sm"><tbody><LoadingRow/><LoadingRow/><LoadingRow/></tbody></table>
            )}
            {!loading && orders?.length === 0 && (
              <EmptyState icon={<FaShoppingBag />} title="No orders yet" subtitle="When customers place orders, they will appear here." />
            )}
            {!loading && orders?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2 font-semibold">Order</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Total</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Placed</th>
                      <th className="px-3 py-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id} className="border-t">
                        <td className="px-3 py-3 font-semibold text-gray-900">{o.code || o._id}</td>
                        <td className="px-3 py-3 text-gray-700">{o.customerName || "—"}</td>
                        <td className="px-3 py-3 font-medium">{currency(o.total)}</td>
                        <td className="px-3 py-3"><StatusPill type={o.status} /></td>
                        <td className="px-3 py-3 text-gray-500">{o.placedAt ? new Date(o.placedAt).toLocaleString() : "—"}</td>
                        <td className="px-3 py-3">
                          <Link to={`/vendor/orders/${o._id}`} className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Products */}
          <SectionCard
            title="Products"
            action={<Link to="/vendor/products" className="text-sm font-semibold text-indigo-700 hover:underline">Manage</Link>}
          >
            {loading && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            )}
            {!loading && products?.length === 0 && (
              <EmptyState
                icon={<FaBoxOpen />}
                title="No products yet"
                subtitle="Start by adding your first product."
                action={<Link to="/vendor/products/new" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Add Product</Link>}
              />
            )}
            {!loading && products?.length > 0 && (
              <div id="products" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <div key={p._id} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                    <div className="aspect-[4/3] bg-gray-50">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-4xl text-gray-200"><FaBoxOpen /></div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="truncate text-sm font-bold text-gray-900">{p.name || "Untitled"}</div>
                          <div className="text-xs text-gray-500">SKU: {p.sku || "—"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{currency(p.price)}</div>
                          <div className={`text-xs ${p.stock <= 10 ? "text-rose-600" : p.stock <= 20 ? "text-amber-600" : "text-gray-500"}`}>{p.stock ?? 0} in stock</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-gray-500">Sold: <span className="font-semibold text-gray-800">{p.sold ?? 0}</span></div>
                        <Link to={`/vendor/products/${p._id}/edit`} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"><FaEdit/> Edit</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Low Stock */}
          <SectionCard
            title="Low Stock Alerts"
            action={<Link to="/vendor/inventory" className="text-sm font-semibold text-indigo-700 hover:underline">Inventory</Link>}
          >
            {loading && <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />}
            {!loading && lowStock?.length === 0 && (
              <EmptyState icon={<FaTruck />} title="No low stock items" subtitle="You're fully stocked." />
            )}
            {!loading && lowStock?.length > 0 && (
              <ul className="space-y-3">
                {lowStock.map((p) => (
                  <li key={p._id} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{p.name}</p>
                      <p className="text-xs text-amber-800/80">SKU: {p.sku || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-amber-900">{p.stock ?? 0} left</span>
                      <Link to={`/vendor/products/${p._id}/edit`} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500">Restock</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Inbox & Promotions */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Inbox" action={<Link to="#inbox" className="text-sm font-semibold text-indigo-700 hover:underline">Open Inbox</Link>}>
              {loading && <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />}
              {!loading && inbox?.length === 0 && (
                <EmptyState icon={<FaBell />} title="No messages" subtitle="Customer messages will appear here." />
              )}
              {!loading && inbox?.length > 0 && (
                <ul className="divide-y">
                  {inbox.map((m) => (
                    <li key={m._id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{m.from}</p>
                        <p className="truncate text-xs text-gray-600">{m.preview}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">{m.time}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Promotions" action={<Link to="/vendor/promotions" className="text-sm font-semibold text-indigo-700 hover:underline">Manage</Link>}>
              {loading && <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />}
              {!loading && promos?.length === 0 && (
                <EmptyState icon={<FaTag />} title="No promotions" subtitle="Create a discount to boost sales." action={<Link to="/vendor/promotions/new" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Create Discount</Link>} />
              )}
              {!loading && promos?.length > 0 && (
                <ul className="divide-y">
                  {promos.map((p) => (
                    <li key={p._id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{p.name || p.code}</p>
                        <p className="truncate text-xs text-gray-600">{p.discountPct ? `${p.discountPct}% off` : ""}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-semibold ${p.active ? "text-emerald-600" : "text-gray-500"}`}>{p.active ? "Active" : "Inactive"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <FaTimesCircle className="mr-2 inline" /> {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
