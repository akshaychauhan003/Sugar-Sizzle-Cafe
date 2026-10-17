'use client';
import { useEffect, useState } from 'react';
import { api, errMsg, money } from '@/lib/api';
import { Empty, Spinner } from '@/components/shared/ui';

export default function EmployeePerformanceLeaderboard({ date, startDate, endDate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

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

  if (loading && !data) return <Spinner />;
  if (err) return <div className="card text-danger small">Failed to load employee performance: {err}</div>;
  if (!data || !data.data || data.data.length === 0) return null;

  const list = data.data;
  const topPerformer = list[0]?.totalTasksCompleted > 0 ? list[0] : null;

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

      {/* Leaderboard Table */}
      <div className="tablewrap" style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>Rank</th>
              <th>Employee Name</th>
              <th>Assigned Roles</th>
              <th style={{ textAlign: 'center' }}>Orders Taken (POS)</th>
              <th style={{ textAlign: 'center' }}>Orders Cooked (Kitchen)</th>
              <th style={{ textAlign: 'center' }}>Orders Delivered (Staff)</th>
              <th style={{ textAlign: 'center' }}>Total Tasks</th>
              <th style={{ textAlign: 'right' }}>Revenue Handled</th>
            </tr>
          </thead>
          <tbody>
            {list.map((emp, index) => {
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
    </div>
  );
}
