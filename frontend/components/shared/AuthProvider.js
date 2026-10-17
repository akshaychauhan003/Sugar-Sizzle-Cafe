'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '@/lib/api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    tokenStore.clear();
    setUser(null);
  }, []);

  const switchRole = useCallback(async (newRole) => {
    const r = await api('/auth/switch-role', { method: 'POST', body: { role: newRole } });
    if (r.token) tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const toast = useCallback((message, type = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, login, logout, switchRole }}>
      <ToastCtx.Provider value={toast}>
        {children}
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </Ctx.Provider>
  );
}
