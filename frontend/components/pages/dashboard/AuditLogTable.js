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
  const [sortBy, setSortBy] = useState('time'); // 'time' | 'user' | 'category'
  const [sortDir, setSortDir] = useState('desc'); // 'desc' | 'asc'

  const filteredAndSorted = useMemo(() => {
    if (!audit) return [];
    let list = audit.filter((a) => {
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

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'time') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'user') {
        cmp = (a.user?.name || '').localeCompare(b.user?.name || '');
      } else if (sortBy === 'category') {
        cmp = (a.action || '').localeCompare(b.action || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [audit, q, cat, roleFilter, sortBy, sortDir]);

  const hasFilters = q || cat !== 'all' || roleFilter !== 'all' || sortBy !== 'time' || sortDir !== 'desc';

  function handleHeaderSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir(col === 'time' ? 'desc' : 'asc');
    }
  }

  const sortArrow = (col) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: '#6366f1', marginLeft: '4px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

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
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>🛡️ Employee Audit &amp; Activity Log</h3>
            <span className="badge" style={{ background: '#ede9fe', color: '#4338ca', fontWeight: 700 }}>
              {filteredAndSorted.length} Events
            </span>
          </div>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Comprehensive tracking of employee actions, role shifts, cooking updates, and deliveries
          </p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="row wrap" style={{ gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              placeholder="🔍 Search action, employee…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: '180px', height: '36px', fontSize: '0.84rem', paddingRight: q ? '24px' : '8px' }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
            )}
          </div>

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

          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [b, d] = e.target.value.split('-');
              setSortBy(b);
              setSortDir(d);
            }}
            style={{ height: '36px', fontSize: '0.84rem' }}
          >
            <option value="time-desc">🕒 Newest First</option>
            <option value="time-asc">🕒 Oldest First</option>
            <option value="user-asc">👤 Employee (A-Z)</option>
            <option value="category-asc">🏷️ Action Category</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setQ('');
                setCat('all');
                setRoleFilter('all');
                setSortBy('time');
                setSortDir('desc');
              }}
              style={{ height: '36px', fontSize: '0.82rem' }}
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {!audit ? (
        <Spinner />
      ) : filteredAndSorted.length === 0 ? (
        <Empty>No audit log events match your filter criteria.</Empty>
      ) : (
        <table className="tbl" style={{ width: '100%', minWidth: '650px' }}>
          <thead>
            <tr>
              <th
                style={{ width: '160px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderSort('time')}
              >
                Date &amp; Time{sortArrow('time')}
              </th>
              <th
                style={{ width: '180px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderSort('user')}
              >
                Employee{sortArrow('user')}
              </th>
              <th
                style={{ width: '130px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleHeaderSort('category')}
              >
                Category{sortArrow('category')}
              </th>
              <th>Action Summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((a) => (
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
