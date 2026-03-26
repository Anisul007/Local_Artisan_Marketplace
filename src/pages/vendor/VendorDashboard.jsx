import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaShoppingBag,
  FaChartLine,
  FaTag,
  FaBoxOpen,
  FaCheckCircle,
  FaPlus,
  FaList,
  FaClipboardList,
  FaPercent,
  FaCubes,
} from "react-icons/fa";
import { apiGet } from "../../lib/api";
import { ListingsAPI } from "../../lib/api";
 
const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format((Number(cents) || 0) / 100);

const Card = ({ title, action, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const KPI = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
        {icon}
      </div>
    </div>
  </div>
);

function StatusPill({ status }) {
  const map = {
    active: "bg-emerald-100 text-emerald-800",
    draft: "bg-amber-100 text-amber-800",
    out_of_stock: "bg-sky-100 text-sky-800",
    unavailable: "bg-gray-100 text-gray-700",
    archived: "bg-rose-100 text-rose-800",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {String(status || "—").replace(/_/g, " ")}
    </span>
  );
}

const quickLinks = [
  { to: "/vendor/listings", label: "Manage listings", icon: <FaList /> },
  { to: "/vendor/orders", label: "View orders", icon: <FaClipboardList /> },
  { to: "/vendor/promotions", label: "Promotions", icon: <FaPercent /> },
  { to: "/vendor/inventory", label: "Inventory", icon: <FaCubes /> },
];

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const listingsRes = await ListingsAPI.list("", "", 1);
        const items =
          Array.isArray(listingsRes?.data?.data?.items) ? listingsRes.data.data.items :
          Array.isArray(listingsRes?.data?.items) ? listingsRes.data.items :
          Array.isArray(listingsRes?.data) ? listingsRes.data : [];
        const mapped = items.slice(0, 6).map((it) => ({
          _id: it?._id,
          name: it?.title || "Untitled",
          price: Number(it?.pricing?.priceCents || 0),
          currency: it?.pricing?.currency || "AUD",
          imageUrl: it?.images?.find((i) => i?.isPrimary)?.url || it?.images?.[0]?.url || "",
          stock: it?.inventory?.stockQty ?? 0,
          status: it?.inventory?.status || "draft",
        }));
        if (!cancelled) setProducts(mapped);

        try {
          const [s, o, prof] = await Promise.allSettled([
            apiGet("/api/vendor/summary"),
            apiGet("/api/vendor/orders?limit=5"),
            apiGet("/api/vendor/profile"),
          ]);
          if (!cancelled) {
            if (s.status === "fulfilled") setSummary(s.value?.data || null);
            if (o.status === "fulfilled") setOrders(o.value?.data?.items || []);
            if (prof.status === "fulfilled") setProfile(prof.value?.data || null);
          }
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const kpis = useMemo(() => [
    { label: "Revenue (today)", value: summary ? money(summary.revenueToday, "AUD") : "—", icon: <FaChartLine /> },
    { label: "Orders", value: summary?.orders ?? "—", icon: <FaShoppingBag /> },
    {
      label: "Conversion",
      value: typeof summary?.conversion === "number" ? `${summary.conversion.toFixed(1)}%` : "—",
      icon: <FaChartLine />,
    },
    { label: "Avg. order value", value: summary ? money(summary.aov, "AUD") : "—", icon: <FaTag /> },
  ], [summary]);

  const completeness = (() => {
    if (!profile) return 0;
    const checks = [
      !!profile.businessName,
      !!profile.brandColor,
      !!profile.logoUrl,
      !!profile.address?.city,
      !!profile.taxNumber,
      !!profile.contactEmail,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  })();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Overview of your store, orders, and quick actions.
            </p>
          </div>
          <Link
            to="/vendor/listings/new"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <FaPlus />
            Add product
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KPI key={k.label} label={k.label} value={k.value} icon={k.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Business profile"
          action={<Link to="/vendor/profile" className="text-sm font-semibold text-indigo-600 hover:underline">Edit</Link>}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <FaCheckCircle />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">Completeness</span>
                <span className="font-semibold text-gray-700">{completeness}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">Complete your profile to build buyer trust.</p>
            </div>
          </div>
        </Card>

        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
              >
                <span className="text-indigo-600">{icon}</span>
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <Card
          title="Promotions"
          action={<Link to="/vendor/promotions" className="text-sm font-semibold text-indigo-600 hover:underline">Manage</Link>}
        >
          <p className="text-sm text-gray-600">No active promotions. Create a discount to boost sales.</p>
        </Card>
      </div>

      <Card
        title="Recent orders"
        action={<Link to="/vendor/orders" className="text-sm font-semibold text-indigo-600 hover:underline">View all</Link>}
      >
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet. Your orders will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Customer</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-t border-gray-100">
                    <td className="px-3 py-3 font-medium text-gray-900">{o.code || o._id}</td>
                    <td className="px-3 py-3">{o.customerName || "—"}</td>
                    <td className="px-3 py-3">{money(Number(o.total || 0) * 100)}</td>
                    <td className="px-3 py-3 text-gray-500">
                      {o.placedAt ? new Date(o.placedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Recent products"
        action={<Link to="/vendor/listings" className="text-sm font-semibold text-indigo-600 hover:underline">Manage all</Link>}
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center">
            <p className="text-sm text-gray-600">No products yet.</p>
            <Link
              to="/vendor/listings/new"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline"
            >
              <FaPlus />
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link
                key={p._id}
                to={`/vendor/listings/${p._id}/edit`}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-gray-100">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <FaBoxOpen className="text-4xl" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-medium text-gray-900 group-hover:text-indigo-600">{p.name}</span>
                    <span className="shrink-0 text-sm font-semibold text-gray-900">{money(p.price, p.currency)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Stock: {p.stock ?? 0}</span>
                    <StatusPill status={p.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
