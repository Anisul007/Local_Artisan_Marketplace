import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaShoppingBag, FaChartLine, FaTag, FaBoxOpen, FaCheckCircle } from "react-icons/fa";
import { apiGet } from "../../lib/api"; // still used for future endpoints if you add them
import { ListingsAPI } from "../../lib/api";

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur })
    .format((Number(cents) || 0) / 100);

const Card = ({ title, action, children }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const KPI = ({ label, value, icon }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>
    </div>
  </div>
);

function StatusPill({ status }) {
  const map = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    draft: "bg-amber-50 text-amber-700 ring-amber-200",
    out_of_stock: "bg-sky-50 text-sky-700 ring-sky-200",
    unavailable: "bg-gray-100 text-gray-700 ring-gray-200",
    archived: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700 ring-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {String(status || "—").replace(/_/g, " ")}
    </span>
  );
}

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);

  // Optional (future) data. These endpoints don’t exist yet on your server.
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);

  // The important one—your actual products.
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        // ---- PRODUCTS (existing backend) ----
        const listingsRes = await ListingsAPI.list("", "", 1); // no search, no status filter, page 1
        // Accept any of the server shapes:
        const items =
          Array.isArray(listingsRes?.data?.data?.items) ? listingsRes.data.data.items :
          Array.isArray(listingsRes?.data?.items) ? listingsRes.data.items :
          Array.isArray(listingsRes?.data) ? listingsRes.data :
          [];

        // Map listings to product cards
        const mapped = items.slice(0, 6).map((it) => {
          const img =
            it?.images?.find((i) => i?.isPrimary)?.url ||
            it?.images?.[0]?.url ||
            "";
          return {
            _id: it?._id,
            name: it?.title || "Untitled",
            price: Number(it?.pricing?.priceCents || 0),
            currency: it?.pricing?.currency || "AUD",
            imageUrl: img,
            stock: it?.inventory?.stockQty ?? 0,
            status: it?.inventory?.status || "draft",
          };
        });

        if (!cancelled) setProducts(mapped);

        // ---- Optional future endpoints (safe to leave as-is) ----
        // If you add these routes later, they will populate; otherwise the UI shows placeholders.
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
          /* ignore optional failures */
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const kpis = useMemo(() => ([
    { label: "Revenue (Today)", value: summary ? money(summary.revenueToday, "AUD") : "—", icon: <FaChartLine /> },
    { label: "Orders", value: summary?.orders ?? "—", icon: <FaShoppingBag /> },
    {
      label: "Conversion",
      value: typeof summary?.conversion === "number" ? `${summary.conversion.toFixed(1)}%` : "—",
      icon: <FaChartLine />
    },
    { label: "Avg. Order Value", value: summary ? money(summary.aov, "AUD") : "—", icon: <FaTag /> },
  ]), [summary]);

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
      {/* Headline */}
      <div className="rounded-2xl bg-gradient-to-tr from-indigo-50 via-white to-white p-6 ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Vendor Dashboard</h1>
            <p className="text-sm text-gray-600">Quick snapshot of performance and shortcuts to manage listings.</p>
          </div>
          <Link
            to="/vendor/listings/new"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add Product
          </Link>
        </div>
      </div>

      {/* KPIs (placeholders until summary API exists) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KPI key={k.label} label={k.label} value={k.value} icon={k.icon} />
        ))}
      </div>

      {/* Profile completeness + Quick Links */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Business Profile"
          action={<Link to="/vendor/profile" className="text-sm font-semibold text-indigo-700 hover:underline">Edit</Link>}
        >
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <FaCheckCircle />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <div className="font-semibold text-gray-900">Profile completeness</div>
                <div className="text-gray-600">{completeness}%</div>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-2 bg-indigo-500" style={{ width: `${completeness}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">Complete your business details to boost trust and conversions.</p>
            </div>
          </div>
        </Card>

        <Card title="Quick Links">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link to="/vendor/listings" className="rounded-xl border p-3 hover:bg-gray-50">Manage Listings</Link>
            <Link to="/vendor/orders" className="rounded-xl border p-3 hover:bg-gray-50">View Orders</Link>
            <Link to="/vendor/promotions" className="rounded-xl border p-3 hover:bg-gray-50">Create Promo</Link>
            <Link to="/vendor/inventory" className="rounded-xl border p-3 hover:bg-gray-50">Inventory</Link>
          </div>
        </Card>

        <Card
          title="Promotions"
          action={<Link to="/vendor/promotions" className="text-sm font-semibold text-indigo-700 hover:underline">Manage</Link>}
        >
          <p className="text-sm text-gray-600">No promotions yet. Create a discount to boost sales.</p>
        </Card>
      </div>

      {/* Orders (placeholder until orders API exists) */}
      <Card
        title="Recent Orders"
        action={<Link to="/vendor/orders" className="text-sm font-semibold text-indigo-700 hover:underline">View all</Link>}
      >
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ) : orders.length === 0 ? (
          <div className="text-sm text-gray-600">No orders yet.</div>
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
                  <tr key={o._id} className="border-t">
                    <td className="px-3 py-3 font-semibold text-gray-900">{o.code || o._id}</td>
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

      {/* Products */}
      <Card
        title="Products"
        action={<Link to="/vendor/listings" className="text-sm font-semibold text-indigo-700 hover:underline">Manage</Link>}
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-sm text-gray-600">No products yet. Start by adding your first product.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p._id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <div className="aspect-[4/3] bg-gray-50">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-4xl text-gray-200">
                      <FaBoxOpen />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="truncate text-sm font-bold text-gray-900">{p.name}</div>
                    <div className="text-sm font-semibold text-gray-900">{money(p.price, p.currency)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <div>Stock: {p.stock ?? 0}</div>
                    <StatusPill status={p.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}



