import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Home from "./pages/Home";
import About from "./pages/About";
import BlogPage from "./pages/Blog"; 
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForMakersPage from "./pages/ForMakers";
import ForgotPassword from "./pages/ForgotPassword";

import NavBar from "./layout/NavBar";
import Footer from "./layout/Footer.jsx";

// NEW: simple vendor dashboard page (import it)
import VendorDashboard from "./pages/VendorDashboard.jsx";

// Guard: only allow vendors into /vendor/dashboard
function VendorOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or show a spinner/skeleton
  const isVendor =
    user?.isVendor || user?.role === "vendor" || user?.role === "seller";
  return isVendor ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        {/* public */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/for-makers" element={<ForMakersPage />} />

        

        {/* vendor-only */}
        <Route
          path="/vendor/dashboard"
          element={
            <VendorOnly>
              <VendorDashboard />
            </VendorOnly>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;

