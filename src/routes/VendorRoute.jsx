import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guards all /vendor/* routes.
 * - Redirects unauthenticated users to /login
 * - Redirects non-vendors to /
 */
export default function VendorRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // or a spinner if you prefer
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "vendor") return <Navigate to="/" replace />;

  return children;
}
