import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  FaStore, FaTachometerAlt, FaBoxOpen, FaShoppingBag, FaTag, FaCog, FaUserCircle, FaBars, FaTimes
} from "react-icons/fa";

// brand helpers (you can tweak these to match your palette)
const brand = {
  grad: "from-fuchsia-500 via-indigo-500 to-cyan-500",
  text: "text-indigo-700",
  chip: "bg-indigo-50 text-indigo-600",
  focus: "focus:ring-indigo-400",
};

const NavItem = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
       ${isActive ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`
    }
  >
    <span className="text-base">{icon}</span>
    <span>{children}</span>
  </NavLink>
);

export default function VendorLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {open ? <FaTimes /> : <FaBars />}
          </button>

          <Link to="/vendor/dashboard" className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-xl bg-gradient-to-tr ${brand.grad}`} />
            <div className="font-extrabold tracking-tight text-gray-900">Vendor Portal</div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/vendor/listings/new"
              className={`rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 ${brand.focus}`}
            >
              + Add Product
            </Link>
            <Link
              to="/"
              className="hidden rounded-full border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 sm:block"
            >
              View Storefront
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside
          className={`lg:col-span-3 ${open ? "block" : "hidden"} lg:block`}
          onClick={() => setOpen(false)}
        >
          <div className="space-y-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-tr from-indigo-50 to-white p-3">
              <div className={`grid h-10 w-10 place-items-center rounded-full ${brand.chip}`}>
                <FaStore />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Your Store</div>
                <div className="text-xs text-gray-500">Manage products, orders & profile</div>
              </div>
            </div>

            <nav className="space-y-1">
              <NavItem to="/vendor/dashboard" icon={<FaTachometerAlt />}>Dashboard</NavItem>
              <NavItem to="/vendor/listings" icon={<FaBoxOpen />}>My Listings</NavItem>
              <NavItem to="/vendor/orders" icon={<FaShoppingBag />}>Orders</NavItem>
              <NavItem to="/vendor/inventory" icon={<FaBoxOpen />}>Inventory</NavItem>
              <NavItem to="/vendor/promotions" icon={<FaTag />}>Promotions</NavItem>
              <NavItem to="/vendor/profile" icon={<FaUserCircle />}>Business Profile</NavItem>
              <NavItem to="/vendor/reviews" icon={<FaCog />}>Reviews</NavItem>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <section className="lg:col-span-9">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
