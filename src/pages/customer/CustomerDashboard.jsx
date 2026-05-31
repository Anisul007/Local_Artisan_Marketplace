import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function CustomerDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <main className="max-w-4xl mx-auto px-4 py-12"><div className="h-24 rounded-xl bg-gray-200 animate-pulse" /></main>;
  if (!user) return <Navigate to="/login?next=/account" replace />;
  if (user.role === "vendor") return <Navigate to="/vendor/dashboard" replace />;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-gray-900">My dashboard</h1>
      <p className="text-gray-600 mt-1">Welcome back, {user.firstName || "Customer"}.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/account/profile" className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition">
          <div className="font-semibold text-gray-900">Edit profile</div>
          <div className="text-sm text-gray-600 mt-1">Update name, email, phone, password and address.</div>
        </Link>
        <Link to="/account/notifications" className="rounded-xl border border-purple-100 bg-purple-50/40 p-5 hover:shadow-md transition">
          <div className="font-semibold text-gray-900">Notifications</div>
          <div className="text-sm text-gray-600 mt-1">Order updates, seller messages, and platform notes.</div>
        </Link>
        <Link to="/orders" className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition">
          <div className="font-semibold text-gray-900">My orders</div>
          <div className="text-sm text-gray-600 mt-1">Track your order history and statuses.</div>
        </Link>
        <Link to="/wishlist" className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition">
          <div className="font-semibold text-gray-900">Wishlist</div>
          <div className="text-sm text-gray-600 mt-1">Saved items you want to buy later.</div>
        </Link>
        <Link to="/cart" className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition">
          <div className="font-semibold text-gray-900">Cart</div>
          <div className="text-sm text-gray-600 mt-1">Review cart items and checkout quickly.</div>
        </Link>
        <Link to="/account/report-abuse" className="rounded-xl border border-rose-100 bg-rose-50/50 p-5 hover:shadow-md transition sm:col-span-2">
          <div className="font-semibold text-gray-900">Report abuse</div>
          <div className="text-sm text-gray-600 mt-1">Flag a listing, seller, or order for admin review.</div>
        </Link>
      </div>
    </main>
  );
}
