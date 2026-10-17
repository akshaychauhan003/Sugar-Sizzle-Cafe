'use client';
import { useMemo, useState } from 'react';
import { Empty, Spinner } from '@/components/shared/ui';

const ACTION_CATEGORIES = [
  { key: 'all', label: 'All Actions' },
  { key: 'order', label: 'Orders & Service' },
  { key: 'stock', label: 'Stock & Inventory' },
  { key: 'payment', label: 'Payments' },
  { key: 'user', label: 'Users & Roles' },
];

export default function AuditLogTable({ audit }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!audit) return [];
    return audit.filter((a) => {
      // Search filter
      const searchTarget = `${a.summary || ''} ${a.action || ''} ${a.user?.name || ''} ${a.user?.email || ''}`.toLowerCase();
      if (q.trim() && !searchTarget.includes(q.trim().toLowerCase())) return false;

      // Action category filter
      if (cat !== 'all') {
        if (cat === 'order' && !a.action?.startsWith('order.')) return false;
        if (cat === 'stock' && !a.action?.startsWith('stock.')) return false;
        if (cat === 'payment' && !a.action?.includes('payment') && !a.action?.includes('refund')) return false;
        if (cat === 'user' && !a.action?.startsWith('user.') && !a.action?.startsWith('auth.')) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        const uRole = a.user?.role || '';
        if (uRole !== roleFilter) return false;
      }

      return true;
    });
  }, [audit, q, cat, roleFilter]);

  function getActionBadge(action = '') {
    if (action.startsWith('order.')) {
      if (action.includes('deliver')) return <span className="badge" style={{ background: '#ecfdf5', color: '#065f46' }}>🚚 Delivery</span>;
      if (action.includes('confirm') || action.includes('status')) return <span className="badge type">🍳 Order Flow</span>;
      return <span className="badge type">{action}</span>;
    }
    if (action.startsWith('stock.')) {
      if (action.includes('wastage')) return <span className="badge" style={{ background: '#fef2f2', color: '#991b1b' }}>⚠️ Wastage</span>;
      return <span className="badge" style={{ background: '#fefce8', color: '#854d0e' }}>📦 Stock</span>;
    }
    if (action.includes('payment') || action.includes('refund')) {
      return <span className="badge st-completed">💵 Payment</span>;
    }
    if (action.startsWith('auth.') || action.startsWith('user.')) {
      return <span className="badge" style={{ background: '#f3e8ff', color: '#6b21a8' }}>👤 User/Role</span>;
    }
    return <span className="badge muted">{action}</span>;
  }

  return (
    <div className="card tablewrap" style={{ marginTop: '16px', borderLeft: '4px solid #6366f1' }}>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0 }}>🛡️ Employee Audit &amp; Activity Log</h3>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Comprehensive tracking of employee actions, role shifts, cooking updates, and deliveries
          </p>
        </div>

        {/* Filter Controls */}
        <div className="row wrap" style={{ gap: '8px', alignItems: 'center' }}>
          <input
            placeholder="Search action, employee…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: '180px', height: '36px', fontSize: '0.84rem' }}
          />

          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            style={{ height: '36px', fontSize: '0.84rem' }}
          >
            {ACTION_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ height: '36px', fontSize: '0.84rem' }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="cashier">Cashier</option>
            <option value="kitchen">Chef / Kitchen</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>

      {!audit ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty>No audit log events match your filter criteria.</Empty>
      ) : (
        <table className="tbl" style={{ width: '100%', minWidth: '650px' }}>
          <thead>
            <tr>
              <th style={{ width: '160px' }}>Date &amp; Time</th>
              <th style={{ width: '180px' }}>Employee</th>
              <th style={{ width: '130px' }}>Category</th>
              <th>Action Summary</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {a.user?.name || 'System'}
                  </div>
                  {a.user?.role && (
                    <span className="badge type" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {a.user.role.toUpperCase()}
                    </span>
                  )}
                </td>
                <td>
                  {getActionBadge(a.action)}
                </td>
                <td style={{ fontSize: '0.86rem' }}>
                  <div style={{ fontWeight: 500 }}>{a.summary || a.action}</div>
                  {a.meta && typeof a.meta === 'object' && Object.keys(a.meta).length > 0 && (
                    <div className="muted small" style={{ fontSize: '0.74rem', marginTop: '2px' }}>
                      {Object.entries(a.meta).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
