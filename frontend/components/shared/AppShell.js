'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth, useToast } from './AuthProvider';
import { Spinner } from './ui';
import { api, ROLE_LABELS, ROLE_ICONS, errMsg } from '@/lib/api';
import ChangePasswordModal from './ChangePasswordModal';

const ALL_NAV = [
  { href: '/pos', label: 'POS Register', icon: '🧾', roles: ['admin', 'shift_manager', 'cashier'] },
  { href: '/orders', label: 'Orders & Service', icon: '📋', roles: ['admin', 'shift_manager', 'cashier', 'staff', 'kitchen'] },
  { href: '/kitchen', label: 'Kitchen & Stocks', icon: '🍳', roles: ['admin', 'shift_manager', 'kitchen'] },
  { href: '/menu', label: 'Menu & Stock Hub', icon: '🍽️', roles: ['admin', 'shift_manager'] },
  { href: '/reports', label: 'Reports & Analytics', icon: '📊', roles: ['admin', 'shift_manager'] },
];

export default function AppShell({ children }) {
  const { user, loading, logout, switchRole } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState('');
  const [liveOrdersCount, setLiveOrdersCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll active orders count for top bar badge
  useEffect(() => {
    if (!user) return;
    const fetchActiveCount = () => {
      api('/orders?limit=100')
        .then((res) => {
          const active = (res.data || []).filter((o) =>
            ['pending', 'preparing', 'ready'].includes(o.status),
          ).length;
          setLiveOrdersCount(active);
        })
        .catch(() => {});
    };
    fetchActiveCount();
    const timer = setInterval(fetchActiveCount, 12000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'kitchen' && (path === '/pos' || path === '/menu' || path === '/reports' || path === '/')) {
        router.replace('/kitchen');
      } else if (user.role === 'staff' && (path === '/pos' || path === '/menu' || path === '/reports' || path === '/kitchen' || path === '/')) {
        router.replace('/orders');
      } else if (user.role === 'cashier' && (path === '/kitchen' || path === '/menu' || path === '/reports' || path === '/')) {
        router.replace('/pos');
      }
    }
  }, [loading, user, path, router]);

  useEffect(() => setOpen(false), [path]);
  if (loading || !user) return <Spinner />;

  const userRoles = (user?.roles && user.roles.length) ? user.roles : (user?.role ? [user.role] : ['staff']);
  const isMasterAdmin = user?.role === 'admin' || userRoles.includes('admin');
  const selectableRoles = isMasterAdmin
    ? ['admin', 'cashier', 'kitchen', 'staff']
    : [...new Set(userRoles)];

  const navItems = ALL_NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const active = (href) => {
    if (href === '/pos') return path === '/pos' || path === '/';
    return path === href || path.startsWith(`${href}/`);
  };

  return (
    <div className="shell">
      {/* Sidebar Navigation */}
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="logo">☕</span>
          <div>
            <b>Sugar & Sizzle Café</b>
            <small>ARTISAN COFFEE & KITCHEN</small>
          </div>
          <button
            className="icon-btn side-close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Mobile User Profile Section inside Sidebar */}
        <div className="side-user-card">
          <div className="side-user-header">
            <div className="avatar-circle">
              {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
            </div>
            <div className="side-user-details">
              <b>{user.name}</b>
              <span className="side-role-badge">
                {ROLE_ICONS[user.role] || '👤'} {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
          </div>
          {selectableRoles.length > 1 && (
            <div className="side-role-switch">
              <span className="side-role-label">Active Role:</span>
              <select
                className="role-switch-dropdown"
                value={user.role}
                onChange={async (e) => {
                  const newRole = e.target.value;
                  try {
                    await switchRole(newRole);
                    toast(`Active role changed to ${ROLE_LABELS[newRole] || newRole}`);
                    if (newRole === 'kitchen') router.push('/kitchen');
                    else if (newRole === 'cashier') router.push('/pos');
                    else if (newRole === 'staff') router.push('/orders');
                  } catch (err) {
                    toast(errMsg(err), 'err');
                  }
                }}
              >
                {selectableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_ICONS[r] || '👤'} {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="side-user-actions">
            <button
              type="button"
              className="btn sm side-btn-action"
              onClick={() => {
                setOpen(false);
                setShowPasswordModal(true);
              }}
            >
              🔑 Password
            </button>
            <button
              type="button"
              className="btn sm danger side-btn-action"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>

        <nav>
          {navItems.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav ${active(n.href) ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
              {n.href === '/orders' && liveOrdersCount > 0 && (
                <span className="nav-badge">{liveOrdersCount} active</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="side-footer">
          <div className="terminal-status">
            <span className="online-dot" />
            <div>
              <div className="term-label">Register Online • Active</div>
              <div className="term-sub">Terminal #01 • Main Counter</div>
            </div>
          </div>
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      {/* Main App Workstation View */}
      <div className="main">
        <header className="top">
          <button
            className="icon-btn menu-btn"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>

          <div className="top-brand-mobile">
            <b>☕ Sugar & Sizzle</b>
          </div>

          <div className="top-pills">
            <div className="pill clock-pill">
              <span className="clock-icon">🕒</span>
              <span>{clock}</span>
            </div>

            <Link href="/orders" className="pill orders-pill" title="View active orders in queue">
              <span className="pulse-dot" />
              <span>{liveOrdersCount} Active {liveOrdersCount === 1 ? 'Order' : 'Orders'}</span>
            </Link>
          </div>

          <div className="grow" />

          {/* Quick Active Orders Pill on Mobile */}
          <Link href="/orders" className="mobile-orders-pill" title="Active Orders Queue">
            <span className="pulse-dot" />
            <span>{liveOrdersCount}</span>
          </Link>

          {/* Current Active Role Badge */}
          <div className="role-navbar-pill">
            <span className="role-icon">{ROLE_ICONS[user.role] || '👤'}</span>
            <span className="role-text">{ROLE_LABELS[user.role] || user.role}</span>
          </div>

          {/* Multi-role Switcher if user has > 1 role or is admin */}
          {selectableRoles.length > 1 && (
            <div className="role-switch-wrapper desktop-only" title="Switch your active working role">
              <span className="role-switch-label">Switch:</span>
              <select
                className="role-switch-dropdown"
                value={user.role}
                onChange={async (e) => {
                  const newRole = e.target.value;
                  try {
                    await switchRole(newRole);
                    toast(`Active role changed to ${ROLE_LABELS[newRole] || newRole}`);
                    if (newRole === 'kitchen') router.push('/kitchen');
                    else if (newRole === 'cashier') router.push('/pos');
                    else if (newRole === 'staff') router.push('/orders');
                  } catch (err) {
                    toast(errMsg(err), 'err');
                  }
                }}
              >
                {selectableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_ICONS[r] || '👤'} {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            className="user-profile clickable"
            onClick={() => setShowPasswordModal(true)}
            role="button"
            tabIndex={0}
            title="Click to update password"
          >
            <div className="avatar-circle">
              {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
            </div>
            <div className="who">
              <b>{user.name}</b>
              <small>
                {ROLE_LABELS[user.role] || user.role} • 🔑
              </small>
            </div>
          </div>

          <button
            className="btn sm desktop-only"
            onClick={() => setShowPasswordModal(true)}
            title="Update your account password"
          >
            Password 🔑
          </button>

          <button
            className="btn sm signout-btn"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            title="Sign out of terminal"
          >
            <span className="signout-text">Sign out</span>
            <span className="signout-icon">🚪</span>
          </button>
        </header>

        <main className="content">{children}</main>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}
