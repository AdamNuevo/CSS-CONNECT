import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until we know whether a session exists

  // restore the session after a page refresh
  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // any 401 from the API (expired session, account deactivated) signs the user out
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("ccs:unauthorized", onUnauthorized);
    return () => window.removeEventListener("ccs:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const d = await api("/auth/login", { method: "POST", body: { email, password, remember } });
    setUser(d.user); // user.mustChangePassword sends them to Set password first
  }, []);

  // Set password / Change password. Throws ApiError (with .fields) when the server rejects it.
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const d = await api("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
    setUser(d.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* signing out locally is enough */ }
    setUser(null);
  }, []);

  const setPhoto = useCallback(async (photo) => {
    const d = await api("/auth/me", { method: "PATCH", body: { photo } });
    setUser(d.user);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, setPhoto, changePassword }), [user, loading, login, logout, setPhoto, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
