// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, useEffect } from "react";

// -------- Guards & Layouts --------
import VendorRoute from "./routes/VendorRoute";
import PublicLayout from "./layout/PublicLayout";
import VendorLayout from "./pages/vendor/layout/VendorLayout";

// -------- Public pages --------
import Home from "./pages/Home";
import About from "./pages/About";
import BlogPage from "./pages/Blog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForVendorsPage from "./pages/ForVendors.jsx";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Contact from "./pages/Contact";
import ShopHandmade from "./pages/ShopHandmade";
import Product from "./pages/Product.jsx";

// -------- Vendor pages --------
import VendorDashboard from "./pages/vendor/VendorDashboard.jsx";
import VendorListingsPage from "./pages/vendor/VendorListingsPage.jsx";
import ListingEditorPage from "./pages/vendor/ListingEditorPage.jsx";
import ListingPreviewPage from "./pages/vendor/ListingPreviewPage.jsx";
import VendorReviewsPage from "./pages/vendor/VendorReviewsPage.jsx";
import VendorProfilePage from "./pages/vendor/VendorProfilePage.jsx";
import OrdersPage from "./pages/vendor/OrdersPage.jsx";
import InventoryPage from "./pages/vendor/InventoryPage.jsx";
import PromotionsPage from "./pages/vendor/PromotionsPage.jsx";

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
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="listings" element={<VendorListingsPage />} />
            <Route path="listings/new" element={<ListingEditorPage isNew />} />
            <Route path="listings/:id/edit" element={<ListingEditorPage />} />
            <Route path="listings/:id/preview" element={<ListingPreviewPage />} />
            <Route path="reviews" element={<VendorReviewsPage />} />
            <Route path="profile" element={<VendorProfilePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
          </Route>

          {/* ---------- Fallback ---------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}



