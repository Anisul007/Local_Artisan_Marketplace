// src/app/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";

// -------- Guards & Layouts --------
const VendorRoute = lazy(() => import("../routes/VendorRoute"));
const AdminRoute = lazy(() => import("../routes/AdminRoute"));
const PublicLayout = lazy(() => import("../layout/PublicLayout"));
const VendorLayout = lazy(() => import("../pages/vendor/layout/VendorLayout"));
const AdminLayout = lazy(() => import("../pages/admin/layout/AdminLayout"));

// -------- Public pages --------
const Home = lazy(() => import("../pages/public/Home"));
const About = lazy(() => import("../pages/public/About"));
const BlogPage = lazy(() => import("../pages/public/Blog"));
const Login = lazy(() => import("../pages/public/Login"));
const Register = lazy(() => import("../pages/public/Register"));
const ForVendorsPage = lazy(() => import("../pages/public/ForVendors.jsx"));
const ForgotPassword = lazy(() => import("../pages/public/ForgotPassword"));
const VerifyEmail = lazy(() => import("../pages/public/VerifyEmail"));
const Contact = lazy(() => import("../pages/public/Contact"));
const ShopHandmade = lazy(() => import("../pages/public/ShopHandmade"));
const Product = lazy(() => import("../pages/public/Product.jsx"));
const VendorStorefront = lazy(() => import("../pages/public/VendorStorefront.jsx"));
const Wishlist = lazy(() => import("../pages/public/Wishlist.jsx"));
const Cart = lazy(() => import("../pages/public/Cart.jsx"));
const Checkout = lazy(() => import("../pages/public/Checkout.jsx"));
const OrderSuccess = lazy(() => import("../pages/public/OrderSuccess.jsx"));
const MyOrders = lazy(() => import("../pages/public/MyOrders.jsx"));

// -------- Customer account --------
const CustomerDashboard = lazy(() => import("../pages/customer/CustomerDashboard.jsx"));
const CustomerNotificationsPage = lazy(() => import("../pages/customer/CustomerNotificationsPage.jsx"));
const CustomerProfilePage = lazy(() => import("../pages/customer/CustomerProfilePage.jsx"));
const ReportAbusePage = lazy(() => import("../pages/customer/ReportAbusePage.jsx"));

// -------- Vendor pages --------
const VendorDashboardBackoffice = lazy(() => import("../pages/vendor/VendorDashboardBackoffice.jsx"));
const VendorListingsPage = lazy(() => import("../pages/vendor/VendorListingsPage.jsx"));
const ListingEditorPage = lazy(() => import("../pages/vendor/ListingEditorPage.jsx"));
const ListingPreviewPage = lazy(() => import("../pages/vendor/ListingPreviewPage.jsx"));
const VendorReviewsPage = lazy(() => import("../pages/vendor/VendorReviewsPage.jsx"));
const VendorProfilePage = lazy(() => import("../pages/vendor/VendorProfilePage.jsx"));
const VendorReportAbusePage = lazy(() => import("../pages/vendor/VendorReportAbusePage.jsx"));
const OrdersPage = lazy(() => import("../pages/vendor/OrdersPage.jsx"));
const InventoryPage = lazy(() => import("../pages/vendor/InventoryPage.jsx"));
const PromotionsPage = lazy(() => import("../pages/vendor/PromotionsPage.jsx"));
const SalesInsightsPage = lazy(() => import("../pages/vendor/SalesInsightsPage.jsx"));
const VendorNotificationsPage = lazy(() => import("../pages/vendor/VendorNotificationsPage.jsx"));
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage.jsx"));
const AdminAnalyticsDetailPage = lazy(() => import("../pages/admin/AdminAnalyticsDetailPage.jsx"));
const AdminProfilePage = lazy(() => import("../pages/admin/AdminProfilePage.jsx"));
const AdminLoginPage = lazy(() => import("../pages/admin/AdminLoginPage.jsx"));
const AdminListingsModerationPage = lazy(() => import("../pages/admin/AdminListingsModerationPage.jsx"));
const AdminVendorsPage = lazy(() => import("../pages/admin/AdminVendorsPage.jsx"));
const AdminAbuseReportsPage = lazy(() => import("../pages/admin/AdminAbuseReportsPage.jsx"));
const AdminContactMessagesPage = lazy(() => import("../pages/admin/AdminContactMessagesPage.jsx"));
const AdminCustomersPage = lazy(() => import("../pages/admin/AdminCustomersPage.jsx"));
const AdminProductsPage = lazy(() => import("../pages/admin/AdminProductsPage.jsx"));
const AdminCatalogPage = lazy(() => import("../pages/admin/AdminCatalogPage.jsx"));
const AdminOrdersPage = lazy(() => import("../pages/admin/AdminOrdersPage.jsx"));
const AdminPaymentsPage = lazy(() => import("../pages/admin/AdminPaymentsPage.jsx"));
const AdminShippingPage = lazy(() => import("../pages/admin/AdminShippingPage.jsx"));
const AdminReviewsModerationPage = lazy(() => import("../pages/admin/AdminReviewsModerationPage.jsx"));
const AdminGlobalPromotionsPage = lazy(() => import("../pages/admin/AdminGlobalPromotionsPage.jsx"));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage.jsx"));
const AdminUserDetailPage = lazy(() => import("../pages/admin/AdminUserDetailPage.jsx"));

// Smooth scroll to top on route change (useful with long public pages)
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Routes>
          {/* ---------- Public site (with header/footer) ---------- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/shop" element={<ShopHandmade />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/makers/:vendorId" element={<VendorStorefront />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/account" element={<CustomerDashboard />} />
            <Route path="/account/notifications" element={<CustomerNotificationsPage />} />
            <Route path="/account/profile" element={<CustomerProfilePage />} />
            <Route path="/account/report-abuse" element={<ReportAbusePage />} />
            <Route path="/orders/:orderId/success" element={<OrderSuccess />} />
            <Route path="/for-vendors" element={<ForVendorsPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>

          {/* ---------- Vendor portal (separate layout; no public header/footer) ---------- */}
          <Route
            path="/vendor"
            element={
              <VendorRoute>
                <VendorLayout />
              </VendorRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<VendorDashboardBackoffice />} />
            <Route path="notifications" element={<VendorNotificationsPage />} />
            <Route path="listings" element={<VendorListingsPage />} />
            <Route path="listings/new" element={<ListingEditorPage isNew />} />
            <Route path="listings/:id/edit" element={<ListingEditorPage />} />
            <Route path="listings/:id/preview" element={<ListingPreviewPage />} />
            <Route path="reviews" element={<VendorReviewsPage />} />
            <Route path="profile" element={<VendorProfilePage />} />
            <Route path="report-abuse" element={<VendorReportAbusePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="sales-insights" element={<SalesInsightsPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="analytics/:metric" element={<AdminAnalyticsDetailPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="listings" element={<AdminListingsModerationPage />} />
            <Route path="vendors" element={<AdminVendorsPage />} />
            <Route path="users/:userId" element={<AdminUserDetailPage />} />
            <Route path="abuse-reports" element={<AdminAbuseReportsPage />} />
            <Route path="contact-messages" element={<AdminContactMessagesPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="catalog" element={<AdminCatalogPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="shipping" element={<AdminShippingPage />} />
            <Route path="reviews" element={<AdminReviewsModerationPage />} />
            <Route path="promotions" element={<AdminGlobalPromotionsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* ---------- Fallback ---------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
