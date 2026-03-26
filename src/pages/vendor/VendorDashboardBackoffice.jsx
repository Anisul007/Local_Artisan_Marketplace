import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaPlus,
  FaList,
  FaCubes,
  FaPercent,
  FaClipboardList,
  FaChartLine,
  FaBoxOpen,
  FaTicketAlt,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { apiGet, ListingsAPI, VendorAPI } from "../../lib/api";

const money = (cents, cur = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format((Number(cents) || 0) / 100);

const Card = ({ title, action, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
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

function StatusLine({ label, value, tone = "gray" }) {
  const tones = {
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
      <span className="text-gray-700">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone] || tones.gray}`}>
        {value}
      </span>
    </div>
  );
}

function PipelineBar({ counts }) {
  const total = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);
  const segWidth = (key) => {
    const n = Number(counts[key] || 0);
    return total > 0 ? (n / total) * 100 : 0;
  };

  return (
    <div className="mt-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
        <div className="bg-amber-400" style={{ width: `${segWidth("draft")}%` }} />
        <div className="bg-emerald-400" style={{ width: `${segWidth("active")}%` }} />
        <div className="bg-sky-400" style={{ width: `${segWidth("out_of_stock")}%` }} />
        <div className="bg-gray-400" style={{ width: `${segWidth("unavailable")}%` }} />
        <div className="bg-rose-400" style={{ width: `${segWidth("archived")}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
        <span>
          Draft: <span className="font-semibold text-gray-900">{counts.draft}</span>
        </span>
        <span>
          Active: <span className="font-semibold text-gray-900">{counts.active}</span>
        </span>
        <span>
          Out of stock: <span className="font-semibold text-gray-900">{counts.out_of_stock}</span>
        </span>
      </div>
    </div>
  );
}

export default function VendorDashboardBackoffice() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [pipelineCounts, setPipelineCounts] = useState({
    draft: 0,
    active: 0,
    out_of_stock: 0,
    unavailable: 0,
    archived: 0,
  });

  const [recentProducts, setRecentProducts] = useState([]);
  const [activeItems, setActiveItems] = useState([]);
  const [draftItems, setDraftItems] = useState([]);

  const [lowThreshold, setLowThreshold] = useState(5);
  const [orderSummary, setOrderSummary] = useState({
    totalOrders: 0,
    totalUnits: 0,
    revenueCents: 0,
    statusBreakdown: { processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
  });
  const [salesTrend, setSalesTrend] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const toPayload = (r) => (r?.data?.data ?? r?.data ?? {});

    const run = async () => {
      setLoading(true);
      try {
        const [draftRes, activeRes, outRes, unavailRes, archivedRes, allRes, profRes, ordersRes] =
          await Promise.allSettled([
            ListingsAPI.list("", "draft", 1),
            ListingsAPI.list("", "active", 1),
            ListingsAPI.list("", "out_of_stock", 1),
            ListingsAPI.list("", "unavailable", 1),
            ListingsAPI.list("", "archived", 1),
            ListingsAPI.list("", "", 1),
            VendorAPI.getProfile(),
            apiGet("/api/vendor/orders?limit=200"),
          ]);

        if (cancelled) return;

        const draftPayload = draftRes.status === "fulfilled" ? toPayload(draftRes.value) : {};
        const activePayload = activeRes.status === "fulfilled" ? toPayload(activeRes.value) : {};
        const outPayload = outRes.status === "fulfilled" ? toPayload(outRes.value) : {};
        const unavailPayload = unavailRes.status === "fulfilled" ? toPayload(unavailRes.value) : {};
        const archivedPayload = archivedRes.status === "fulfilled" ? toPayload(archivedRes.value) : {};
        const allPayload = allRes.status === "fulfilled" ? toPayload(allRes.value) : {};
        const profPayload =
          profRes.status === "fulfilled"
            ? profRes.value?.data?.data ?? profRes.value?.data ?? null
            : null;
        const ordersPayload =
          ordersRes.status === "fulfilled"
            ? ordersRes.value?.data ?? {}
            : {};

        const countFrom = (pl) => Number(pl?.pagination?.total ?? 0);

        setProfile(profPayload);
        setPipelineCounts({
          draft: countFrom(draftPayload),
          active: countFrom(activePayload),
          out_of_stock: countFrom(outPayload),
          unavailable: countFrom(unavailPayload),
          archived: countFrom(archivedPayload),
        });

        const activeArr = Array.isArray(activePayload.items) ? activePayload.items : [];
        const draftArr = Array.isArray(draftPayload.items) ? draftPayload.items : [];
        setActiveItems(activeArr);
        setDraftItems(draftArr);

        const allArr = Array.isArray(allPayload.items) ? allPayload.items : [];
        const mapped = allArr.slice(0, 6).map((it) => ({
          id: it?._id,
          title: it?.title || "Untitled",
          imageUrl: it?.images?.find((i) => i?.isPrimary)?.url || it?.images?.[0]?.url || "",
          priceCents: Number(it?.pricing?.priceCents || 0),
          compareAtCents: Number(it?.pricing?.compareAtCents || 0),
          currency: it?.pricing?.currency || "AUD",
          stock: Number(it?.inventory?.stockQty ?? 0),
          status: it?.inventory?.status || "draft",
          updatedAt: it?.updatedAt || null,
        }));
        setRecentProducts(mapped);

        setOrderSummary(
          ordersPayload?.summary || {
            totalOrders: 0,
            totalUnits: 0,
            revenueCents: 0,
            statusBreakdown: { processing: 0, shipped: 0, delivered: 0, cancelled: 0 },
          }
        );

        const rawOrders = Array.isArray(ordersPayload?.items) ? ordersPayload.items : [];
        const dayKeys = Array.from({ length: 7 }).map((_, idx) => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - (6 - idx));
          return d.toISOString().slice(0, 10);
        });
        const trendMap = new Map(dayKeys.map((k) => [k, { orders: 0, revenueCents: 0 }]));
        for (const o of rawOrders) {
          if (!o?.placedAt) continue;
          const k = new Date(o.placedAt).toISOString().slice(0, 10);
          if (!trendMap.has(k)) continue;
          const cur = trendMap.get(k);
          cur.orders += 1;
          cur.revenueCents += Number(o.vendorTotalCents || 0);
          trendMap.set(k, cur);
        }
        const trend = dayKeys.map((k) => {
          const d = trendMap.get(k) || { orders: 0, revenueCents: 0 };
          const dt = new Date(k);
          return {
            key: k,
            label: dt.toLocaleDateString(undefined, { weekday: "short" }),
            orders: d.orders,
            revenueCents: d.revenueCents,
          };
        });
        setSalesTrend(trend);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeness = useMemo(() => {
    if (!profile) return 0;
    const checks = [
      !!profile.businessName,
      !!profile.contactEmail,
      !!profile.logoUrl,
      !!profile.address?.city,
      !!profile.taxNumber,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const lowStockItems = useMemo(() => {
    const t = Math.max(0, Number(lowThreshold) || 0);
    return activeItems
      .filter((it) => (Number(it?.inventory?.stockQty) || 0) <= t)
      .sort((a, b) => (Number(a?.inventory?.stockQty) || 0) - (Number(b?.inventory?.stockQty) || 0));
  }, [activeItems, lowThreshold]);

  const onSaleCount = useMemo(() => {
    return activeItems.filter((it) => {
      const p = Number(it?.pricing?.priceCents || 0);
      const c = Number(it?.pricing?.compareAtCents || 0);
      return c > p && c > 0;
    }).length;
  }, [activeItems]);

  const draftsMissingPrimary = useMemo(() => {
    return draftItems.filter((it) => {
      const imgs = Array.isArray(it?.images) ? it.images : [];
      return imgs.length > 0 && !imgs.some((i) => i?.isPrimary);
    });
  }, [draftItems]);

  const vendorPublicId = user?.id || user?._id;
  const previewHref = vendorPublicId ? `/makers/${vendorPublicId}?tab=products` : "/makers";

  const actionCenter = useMemo(() => {
    const actions = [];

    if (!profile?.logoUrl) {
      actions.push({
        key: "logo",
        icon: <FaBoxOpen />,
        title: "Add your store logo",
        desc: "Your logo appears on the storefront and in customer browsing.",
        cta: { label: "Update profile", to: "/vendor/profile" },
      });
    }

    if (completeness < 70) {
      actions.push({
        key: "complete",
        icon: <FaChartLine />,
        title: "Complete your business details",
        desc: `Profile completion is ${completeness}%. Add address + tax info where possible.`,
        cta: { label: "Go to profile", to: "/vendor/profile" },
      });
    }

    if (draftsMissingPrimary.length > 0) {
      const first = draftsMissingPrimary[0];
      actions.push({
        key: "primaryImage",
        icon: <FaExclamationTriangle />,
        title: "Drafts need a primary image",
        desc: `${draftsMissingPrimary.length} draft(s) have images but no “primary” image set.`,
        cta: {
          label: "Fix first draft",
          to: first?._id ? `/vendor/listings/${first._id}/edit` : "/vendor/listings",
        },
      });
    }

    if (lowStockItems.length > 0) {
      actions.push({
        key: "restock",
        icon: <FaCubes />,
        title: "Restock low inventory",
        desc: `${lowStockItems.length} active listing(s) are at or below ${lowThreshold} units.`,
        cta: { label: "Manage inventory", to: "/vendor/inventory" },
      });
    }

    if (onSaleCount > 0) {
      actions.push({
        key: "sale",
        icon: <FaPercent />,
        title: "On sale right now",
        desc: `${onSaleCount} active listing(s) have a compare-at price.`,
        cta: { label: "Open promotions", to: "/vendor/promotions" },
      });
    }

    if (actions.length === 0) {
      actions.push({
        key: "healthy",
        icon: <FaCheckCircle />,
        title: "Store looks healthy",
        desc: "No urgent tasks right now. Keep listings updated and monitor stock.",
        cta: { label: "View listings", to: "/vendor/listings" },
      });
    }

    return actions.slice(0, 5);
  }, [profile, completeness, draftsMissingPrimary, lowStockItems.length, lowThreshold, onSaleCount]);

  const pipelineTotal = Object.values(pipelineCounts).reduce((s, n) => s + (Number(n) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Vendor dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Store pipeline, inventory health, and actionable ecommerce controls.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
                Total listings: <span className="font-semibold text-gray-900">{pipelineTotal}</span>
              </span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-200">
                Profile: <span className="font-semibold text-gray-900">{completeness}%</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              to={previewHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <FaTicketAlt />
              Preview storefront
            </Link>
            <Link
              to="/vendor/listings/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <FaPlus />
              Add product
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPI label="Drafts" value={pipelineCounts.draft} icon={<FaList />} />
        <KPI label="Active" value={pipelineCounts.active} icon={<FaChartLine />} />
        <KPI label="Out of stock" value={pipelineCounts.out_of_stock} icon={<FaCubes />} />
        <KPI label="On sale (page 1)" value={onSaleCount} icon={<FaPercent />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Orders snapshot" action={<Link to="/vendor/orders" className="text-xs font-semibold text-indigo-600 hover:underline">Open</Link>}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Orders</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{orderSummary.totalOrders || 0}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Units</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{orderSummary.totalUnits || 0}</div>
            </div>
            <div className="col-span-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{money(orderSummary.revenueCents || 0)}</div>
            </div>
          </div>
        </Card>

        <Card title="Sales pulse (7 days)" action={<span className="text-xs font-semibold text-gray-500">Vendor-side</span>}>
          <div className="space-y-2">
            {salesTrend.map((d) => {
              const maxOrders = Math.max(1, ...salesTrend.map((x) => x.orders || 0));
              const w = ((d.orders || 0) / maxOrders) * 100;
              return (
                <div key={d.key} className="grid grid-cols-[46px_1fr_auto] items-center gap-2 text-xs">
                  <div className="font-semibold text-gray-600">{d.label}</div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${w}%` }} />
                  </div>
                  <div className="text-gray-700">{d.orders} orders</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Order statuses" action={<Link to="/vendor/orders" className="text-xs font-semibold text-indigo-600 hover:underline">Manage</Link>}>
          <div className="space-y-2 text-sm">
            <StatusLine label="Processing" value={orderSummary?.statusBreakdown?.processing || 0} tone="amber" />
            <StatusLine label="Shipped" value={orderSummary?.statusBreakdown?.shipped || 0} tone="blue" />
            <StatusLine label="Delivered" value={orderSummary?.statusBreakdown?.delivered || 0} tone="green" />
            <StatusLine label="Cancelled" value={orderSummary?.statusBreakdown?.cancelled || 0} tone="gray" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Store pipeline" action={<span className="text-xs font-semibold text-gray-500">Live counts</span>}>
          <PipelineBar counts={pipelineCounts} />
        </Card>

        <Card title="Action center" action={<Link to="/vendor/profile" className="text-xs font-semibold text-indigo-600 hover:underline">Fix</Link>}>
          <div className="space-y-3">
            {actionCenter.map((a) => (
              <div key={a.key} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      {a.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{a.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{a.desc}</div>
                    </div>
                  </div>
                  <Link
                    to={a.cta.to}
                    className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    {a.cta.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Quick tools"
          action={<span className="text-xs font-semibold text-gray-500">Ecommerce control</span>}
        >
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/vendor/listings"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
            >
              <FaList className="text-indigo-600" />
              Listings
            </Link>
            <Link
              to="/vendor/inventory"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
            >
              <FaCubes className="text-indigo-600" />
              Stock
            </Link>
            <Link
              to="/vendor/promotions"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
            >
              <FaPercent className="text-indigo-600" />
              Discounts
            </Link>
            <Link
              to="/vendor/orders"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
            >
              <FaClipboardList className="text-indigo-600" />
              Orders
            </Link>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Low stock threshold</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(Number(e.target.value))}
                className="w-full"
              />
              <div className="w-14 text-right text-sm font-semibold text-gray-900">{lowThreshold}</div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Low-stock alerts are computed from active listings on the current page.
              Currently matching: <span className="font-semibold text-gray-800">{lowStockItems.length}</span>.
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Recent activity"
        action={<Link to="/vendor/listings" className="text-sm font-semibold text-indigo-600 hover:underline">Manage</Link>}
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : recentProducts.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-600">No products yet.</p>
            <div className="mt-3">
              <Link to="/vendor/listings/new" className="text-sm font-semibold text-indigo-600 hover:underline">
                Add your first product
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProducts.map((p) => {
              const isOnSale = p.compareAtCents > p.priceCents && p.compareAtCents > 0;
              return (
                <Link
                  key={p.id}
                  to={`/vendor/listings/${p.id}/edit`}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] bg-gray-50">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <FaBoxOpen className="text-4xl" />
                      </div>
                    )}
                    {isOnSale && (
                      <div className="absolute right-3 top-3 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                        On sale
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{p.title}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          Updated {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-gray-900">{money(p.priceCents, p.currency)}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-gray-500">Stock: {p.stock}</div>
                      <StatusPill status={p.status} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

