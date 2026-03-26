import { useState, useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  FaStore,
  FaTachometerAlt,
  FaBoxOpen,
  FaShoppingBag,
  FaTag,
  FaUserCircle,
  FaBars,
  FaTimes,
  FaCubes,
  FaStar,
} from "react-icons/fa";
import { useAuth } from "../../../context/AuthContext";
import { VendorAPI } from "../../../lib/api";

const brand = {
  grad: "from-indigo-500 to-violet-600",
  chip: "bg-indigo-100 text-indigo-700",
  focus: "focus:ring-indigo-400",
};

function StoreAvatar({ profile, user, size = 40 }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = profile?.logoUrl && !imgError ? profile.logoUrl : null;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const initials = name
    ? name.split(/\s+/).slice(0, 2).map((s) => s[0].toUpperCase()).join("")
    : (profile?.businessName || "?").slice(0, 2).toUpperCase();
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={profile?.businessName || "Store"}
        className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-black/10"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${brand.chip} text-sm font-semibold text-indigo-700`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

const NavItem = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
       ${isActive ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`
    }
  >
    <span className="text-[15px] opacity-90">{icon}</span>
    <span>{children}</span>
  </NavLink>
);

const NavGroup = ({ label, children }) => (
  <div>
    <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
      {label}
    </div>
    <div className="space-y-0.5">{children}</div>
  </div>
);

export default function VendorLayout() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const { user } = useAuth();

  const fetchProfile = () => {
    if (!user) return;
    VendorAPI.getProfile()
      .then((r) => {
        const data = r?.data?.data ?? r?.data ?? null;
        setProfile(data || null);
      })
      .catch(() => setProfile(null));
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const onProfileUpdated = () => fetchProfile();
    window.addEventListener("vendor-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("vendor-profile-updated", onProfileUpdated);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50/80">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <FaTimes /> : <FaBars />}
          </button>

          <Link to="/vendor/dashboard" className="flex items-center gap-3">
            <StoreAvatar profile={profile} user={user} size={36} />
            <div>
              <span className="font-bold text-gray-900">Vendor Portal</span>
              <span className="ml-1.5 hidden text-sm font-normal text-gray-500 sm:inline">· Artisan Avenue</span>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/vendor/listings/new"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <span className="text-lg leading-none">+</span>
              Add Product
            </Link>
            <Link
              to="/"
              className="hidden rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:inline-flex"
            >
              View Storefront
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        <aside
          className={`lg:col-span-3 ${open ? "block" : "hidden"} lg:block`}
          onClick={() => setOpen(false)}
        >
          <div className="sticky top-24 space-y-5 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <StoreAvatar profile={profile} user={user} size={40} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{profile?.businessName || "Your Store"}</div>
                <div className="text-xs text-gray-500">Products, orders & profile</div>
              </div>
            </div>

            <nav className="space-y-4">
              <NavGroup label="Overview">
                <NavItem to="/vendor/dashboard" icon={<FaTachometerAlt />}>
                  Dashboard
                </NavItem>
              </NavGroup>
              <NavGroup label="Selling">
                <NavItem to="/vendor/listings" icon={<FaBoxOpen />}>My Listings</NavItem>
                <NavItem to="/vendor/orders" icon={<FaShoppingBag />}>Orders</NavItem>
                <NavItem to="/vendor/inventory" icon={<FaCubes />}>Inventory</NavItem>
                <NavItem to="/vendor/promotions" icon={<FaTag />}>Promotions</NavItem>
              </NavGroup>
              <NavGroup label="Account">
                <NavItem to="/vendor/profile" icon={<FaUserCircle />}>Business Profile</NavItem>
                <NavItem to="/vendor/reviews" icon={<FaStar />}>Reviews</NavItem>
              </NavGroup>
            </nav>
          </div>
        </aside>

        <section className="lg:col-span-9 min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
