'use client';
import { useMemo, useState, useEffect } from 'react';
import { api, errMsg, money } from '@/lib/api';
import { Empty, Spinner } from '@/components/shared/ui';

export default function EmployeePerformanceLeaderboard({ date, startDate, endDate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // Sorting & Filtering State
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'cashier' | 'kitchen' | 'staff' | 'shift_manager' | 'admin'
  const [activityFilter, setActivityFilter] = useState('all'); // 'all' | 'active'
  const [sortBy, setSortBy] = useState('tasks'); // 'tasks' | 'taken' | 'cooked' | 'delivered' | 'revenue' | 'name'
  const [sortDir, setSortDir] = useState('desc'); // 'desc' | 'asc'

  useEffect(() => {
    let active = true;
    setLoading(true);
    const p = new URLSearchParams();
    if (startDate && endDate) {
      p.set('startDate', startDate);
      p.set('endDate', endDate);
    } else if (date) {
      p.set('date', date);
    }

    api(`/reports/employee-performance?${p}`)
      .then((res) => {
        if (active) {
          setData(res.report);
          setErr('');
        }
      })
      .catch((e) => {
        if (active) setErr(errMsg(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [date, startDate, endDate]);

  const list = data?.data || [];

  const filteredAndSorted = useMemo(() => {
    let result = [...list];

    // Search query filter
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      result = result.filter((e) =>
        (e.name || '').toLowerCase().includes(term) ||
        (e.email || '').toLowerCase().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter((e) => {
        const roles = e.roles || [e.role];
        return roles.includes(roleFilter);
      });
    }

    // Activity filter
    if (activityFilter === 'active') {
      result = result.filter((e) => (e.totalTasksCompleted || 0) > 0);
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'tasks') {
        cmp = (a.totalTasksCompleted || 0) - (b.totalTasksCompleted || 0);
      } else if (sortBy === 'taken') {
        cmp = (a.ordersTaken || 0) - (b.ordersTaken || 0);
      } else if (sortBy === 'cooked') {
        cmp = (a.ordersCooked || 0) - (b.ordersCooked || 0);
      } else if (sortBy === 'delivered') {
        cmp = (a.ordersDelivered || 0) - (b.ordersDelivered || 0);
      } else if (sortBy === 'revenue') {
        cmp = (a.revenueTaken || 0) - (b.revenueTaken || 0);
      } else if (sortBy === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [list, q, roleFilter, activityFilter, sortBy, sortDir]);

  if (loading && !data) return <Spinner />;
  if (err) return <div className="card text-danger small">Failed to load employee performance: {err}</div>;
  if (!data || !data.data || data.data.length === 0) return null;

  const topPerformer = filteredAndSorted[0]?.totalTasksCompleted > 0 ? filteredAndSorted[0] : null;
  const hasFilters = q || roleFilter !== 'all' || activityFilter !== 'all' || sortBy !== 'tasks' || sortDir !== 'desc';

  function handleHeaderSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  }

  const sortArrow = (col) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: '#3b82f6', marginLeft: '4px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid #3b82f6' }}>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>📊 Employee Performance &amp; Activity Leaderboard</h3>
            <span className="badge type">{data.date}</span>
          </div>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Track orders taken by Cashiers, meals cooked by Chefs, and deliveries completed by Staff
          </p>
        </div>
        {topPerformer && (
          <span className="badge st-completed" style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
            👑 Top Contributor: <b>{topPerformer.name}</b> ({topPerformer.totalTasksCompleted} tasks)
          </span>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div className="muted small">Orders Taken (Cashiers)</div>
          <b style={{ fontSize: '1.2rem', color: '#15803d' }}>{data.summary.totalOrdersTaken}</b>
        </div>
        <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <div className="muted small">Dishes Cooked (Kitchen)</div>
          <b style={{ fontSize: '1.2rem', color: '#1d4ed8' }}>{data.summary.totalOrdersCooked}</b>
        </div>
        <div style={{ padding: '8px 12px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
          <div className="muted small">Orders Delivered (Staff)</div>
          <b style={{ fontSize: '1.2rem', color: '#7e22ce' }}>{data.summary.totalOrdersDelivered}</b>
        </div>
        <div style={{ padding: '8px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <div className="muted small">Active Employees</div>
          <b style={{ fontSize: '1.2rem', color: '#b45309' }}>{data.summary.totalEmployees}</b>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div
        className="row wrap"
        style={{
          gap: '8px',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'var(--bg-cream-light)',
          borderRadius: '8px',
          border: '1px solid var(--border-light)',
          marginBottom: '14px',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
          <input
            placeholder="🔍 Search employee name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: '100%', height: '36px', fontSize: '0.85rem', paddingRight: q ? '26px' : '10px' }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{
                position: 'absolute',
                right: '8px',
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

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ height: '36px', fontSize: '0.84rem' }}
          title="Filter by employee role"
        >
          <option value="all">👥 All Roles</option>
          <option value="cashier">🧾 Cashier</option>
          <option value="kitchen">🍳 Kitchen / Chef</option>
          <option value="staff">🚚 Staff / Waiter</option>
          <option value="shift_manager">👔 Shift Manager</option>
          <option value="admin">👑 Admin</option>
        </select>

        {/* Activity Filter */}
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          style={{ height: '36px', fontSize: '0.84rem' }}
        >
          <option value="all">All Staff Roster</option>
          <option value="active">Active Contributors Only (Tasks &gt; 0)</option>
        </select>

        {/* Sort Dropdown */}
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [b, d] = e.target.value.split('-');
            setSortBy(b);
            setSortDir(d);
          }}
          style={{ height: '36px', fontSize: '0.84rem' }}
        >
          <option value="tasks-desc">⚡ Most Total Tasks First</option>
          <option value="tasks-asc">⚡ Least Tasks First</option>
          <option value="taken-desc">🧾 Most Orders Taken (POS)</option>
          <option value="cooked-desc">🍳 Most Orders Cooked</option>
          <option value="delivered-desc">🚚 Most Orders Delivered</option>
          <option value="revenue-desc">💰 Highest Revenue Handled</option>
          <option value="name-asc">🔤 Employee Name (A-Z)</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setQ('');
              setRoleFilter('all');
              setActivityFilter('all');
              setSortBy('tasks');
              setSortDir('desc');
            }}
            style={{ height: '36px', fontSize: '0.82rem' }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {filteredAndSorted.length === 0 ? (
        <Empty>No employees match your filter criteria.</Empty>
      ) : (
        <div className="tablewrap" style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Rank</th>
                <th
                  onClick={() => handleHeaderSort('name')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Employee Name{sortArrow('name')}
                </th>
                <th>Assigned Roles</th>
                <th
                  style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('taken')}
                >
                  Orders Taken (POS){sortArrow('taken')}
                </th>
                <th
                  style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('cooked')}
                >
                  Orders Cooked (Kitchen){sortArrow('cooked')}
                </th>
                <th
                  style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('delivered')}
                >
                  Orders Delivered (Staff){sortArrow('delivered')}
                </th>
                <th
                  style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('tasks')}
                >
                  Total Tasks{sortArrow('tasks')}
                </th>
                <th
                  style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('revenue')}
                >
                  Revenue Handled{sortArrow('revenue')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((emp, index) => {
                const isFirst = index === 0 && emp.totalTasksCompleted > 0;
                return (
                  <tr key={emp.userId} style={{ background: isFirst ? 'rgba(254, 243, 199, 0.25)' : undefined }}>
                    <td style={{ fontWeight: 800, color: isFirst ? '#b45309' : '#64748b' }}>
                      {isFirst ? '🥇' : index === 1 && emp.totalTasksCompleted > 0 ? '🥈' : index === 2 && emp.totalTasksCompleted > 0 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{emp.name}</div>
                      <div className="muted small" style={{ fontSize: '0.75rem' }}>{emp.email}</div>
                    </td>
                    <td>
                      <div className="row wrap" style={{ gap: '4px' }}>
                        {(emp.roles || [emp.role]).map((r) => (
                          <span key={r} className="badge type" style={{ fontSize: '0.68rem', padding: '1px 5px' }}>
                            {r.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: emp.ordersTaken > 0 ? 600 : 400, color: emp.ordersTaken > 0 ? '#15803d' : undefined }}>
                      {emp.ordersTaken}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: emp.ordersCooked > 0 ? 600 : 400, color: emp.ordersCooked > 0 ? '#1d4ed8' : undefined }}>
                      {emp.ordersCooked}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: emp.ordersDelivered > 0 ? 600 : 400, color: emp.ordersDelivered > 0 ? '#7e22ce' : undefined }}>
                      {emp.ordersDelivered}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: emp.totalTasksCompleted > 0 ? '#f1f5f9' : 'transparent',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: emp.totalTasksCompleted > 0 ? '#0f172a' : '#94a3b8',
                        }}
                      >
                        {emp.totalTasksCompleted}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>
                      {emp.revenueTaken > 0 ? money(emp.revenueTaken) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
