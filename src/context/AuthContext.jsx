import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiGet, apiPost } from "../lib/api"; // you already have this

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);   // initial “me” fetch

  // hydrate from server cookie on app load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await apiGet("/api/auth/me"); // returns {ok,user} if logged in
        if (mounted && r.ok) setUser(r.user);
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const signIn = useCallback((u) => setUser(u), []);
  const signOut = useCallback(() => setUser(null), []);

  // call backend to clear cookie
  const logout = useCallback(async () => {
    try { await apiPost("/api/auth/logout", {}); } catch {}
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signOut, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
