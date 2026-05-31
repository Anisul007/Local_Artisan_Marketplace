import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { AdminAPI } from "../../../lib/api";
import {
  LayoutDashboard,
  UserCircle2,
  ClipboardCheck,
  Store,
  Users,
  ShoppingBag,
  Shapes,
  ReceiptText,
  CreditCard,
  Truck,
  MessageSquareWarning,
  TicketPercent,
  Settings,
  ShieldAlert,
  Mail,
} from "lucide-react";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/profile", label: "Profile", icon: UserCircle2 },
  { to: "/admin/listings", label: "Listing Approval", icon: ClipboardCheck, countKey: "pendingListings" },
  { to: "/admin/vendors", label: "Vendors", icon: Store, countKey: "unverifiedVendors" },
  { to: "/admin/customers", label: "Customers", icon: Users, countKey: "unverifiedCustomers" },
  { to: "/admin/products", label: "Products", icon: ShoppingBag },
  { to: "/admin/catalog", label: "Categories & Brands", icon: Shapes },
  {
    to: "/admin/orders",
    label: "Orders",
    icon: ReceiptText,
    countFn: (s) =>
      Number(s?.ordersNew || 0) + Number(s?.openOrderIssues || 0) + Number(s?.recentVendorOrderMessages || 0),
  },
  { to: "/admin/payments", label: "Payments & Refunds", icon: CreditCard },
  { to: "/admin/shipping", label: "Shipping", icon: Truck },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquareWarning },
  { to: "/admin/promotions", label: "Promotions", icon: TicketPercent, countKey: "pendingPromotions" },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/abuse-reports", label: "Abuse Reports", icon: ShieldAlert, countKey: "abuseReportsNew" },
  { to: "/admin/contact-messages", label: "Contact Messages", icon: Mail, countKey: "contactMessagesNew" },
];

function sidebarBadgeCount(item, summary) {
  if (!summary) return 0;
  if (typeof item.countFn === "function") return Number(item.countFn(summary) || 0);
  if (item.countKey) return Number(summary[item.countKey] || 0);
  return 0;
}

function NavBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6600] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const name = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.email || "Admin";
  const [notify, setNotify] = useState(null);
  const lastNotifyFetch = useRef(0);

  const refreshNotify = useCallback(async () => {
    const now = Date.now();
    if (now - lastNotifyFetch.current < 1200) return;
    lastNotifyFetch.current = now;
    const r = await AdminAPI.notificationSummary().catch(() => null);
    if (!r?.ok) return;
    const d = r?.data?.data ?? r?.data ?? null;
    if (d) setNotify(d);
  }, []);

  useEffect(() => {
    refreshNotify();
  }, [location.pathname, refreshNotify]);

  useEffect(() => {
    if (user?.role === "admin") refreshNotify();
  }, [user?.id, user?.role, refreshNotify]);

  useEffect(() => {
    const t = setInterval(refreshNotify, 20_000);
    const onVis = () => {
      if (document.visibilityState === "visible") refreshNotify();
    };
    const onFocus = () => refreshNotify();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshNotify]);

  return (
    <div className="admin-app admin-shell">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#4b0082]/8 blur-3xl" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[#ff6600]/10 blur-3xl" />
      </div>

      <header className="admin-header">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo.webp"
              alt="Artisan Avenue"
              className="h-12 w-12 rounded-xl object-cover ring-1 ring-black/10"
            />
            <div>
            <div className="admin-brand-tag">Artisan Avenue</div>
            <div className="mt-1 text-xl font-bold text-gray-900">Admin Control Center</div>
            <div className="text-xs text-gray-500">{name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="admin-btn-outline px-3 py-1.5 text-sm">
              Back to site
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout?.();
                navigate("/admin/login", { replace: true });
              }}
              className="admin-btn-primary px-3 py-1.5 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 md:grid-cols-[280px_1fr]">
        <aside className="admin-sidebar">
          <div className="admin-hub-box mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#4b0082]">Control hub</p>
            <p className="mt-1 text-sm text-gray-600">Manage users, catalog, orders, and platform settings.</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const badge = sidebarBadgeCount(item, notify);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      isActive ? "admin-nav-active" : "admin-nav-idle"
                    }`
                  }
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <NavBadge count={badge} />
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
