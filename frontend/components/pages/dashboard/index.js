'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, download, errMsg, money } from '@/lib/api';
import { useAuth, useToast } from '@/components/shared/AuthProvider';
import { Empty, ErrorBox, Spinner } from '@/components/shared/ui';
import BillModal from '@/components/shared/BillModal';
import SalesMetricsCards from './SalesMetricsCards';
import HourlyRevenueChart from './HourlyRevenueChart';
import CollectionsMix from './CollectionsMix';
import ShiftReconciliation from './ShiftReconciliation';
import RecentOrdersTable from './RecentOrdersTable';
import AuditLogTable from './AuditLogTable';
import ExportCsvModal from './ExportCsvModal';

const getTodayStr = () => new Date().toISOString().slice(0, 10);
const getPrevDayStr = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [preset, setPreset] = useState('today');
  const [date, setDate] = useState(getTodayStr());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  const [audit, setAudit] = useState(null);
  const [shift, setShift] = useState(null);
  const [opening, setOpening] = useState('2000');
  const [actualCash, setActualCash] = useState('');
  const [moveAmt, setMoveAmt] = useState('');
  const [moveType, setMoveType] = useState('in');
  const [busy, setBusy] = useState(false);
  const [bill, setBill] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'shift' | 'orders' | 'audit' | 'all'

  const canManage = ['admin', 'shift_manager'].includes(user?.role);
  const canShift = ['admin', 'shift_manager', 'cashier', 'staff'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (startDate && endDate) {
        p.set('startDate', startDate);
        p.set('endDate', endDate);
      } else if (date) {
        p.set('date', date);
      }
      const report = (await api(`/reports/daily-sales?${p}`)).report;
      setR(report);
      setErr('');
      if (canManage) {
        api(`/reports/audit?limit=12`).then((a) => setAudit(a.data)).catch(() => setAudit([]));
      }
      if (canShift) {
        api('/shifts/active').then((s) => setShift(s.shift)).catch(() => setShift(null));
      }
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [date, startDate, endDate, canManage, canShift]);

  useEffect(() => {
    setR(null);
    load();
  }, [load]);

  useEffect(() => {
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [load]);

  function selectPreset(p) {
    setPreset(p);
    if (p === 'today') {
      setDate(getTodayStr());
      setStartDate('');
      setEndDate('');
    } else if (p === 'yesterday') {
      setDate(getPrevDayStr(1));
      setStartDate('');
      setEndDate('');
    } else if (p === '7days') {
      setDate('');
      setStartDate(getPrevDayStr(6));
      setEndDate(getTodayStr());
    }
  }

  async function openBill(o) {
    try {
      const { order } = await api(`/orders/${o.id}`);
      if (order.status === 'completed') {
        try {
          const inv = await api(`/invoices/by-order/${order.id}`);
          if (inv.invoice?.id) await api(`/invoices/${inv.invoice.id}/reprint`, { method: 'POST' });
        } catch {
          /* proceed */
        }
      }
      setBill(order);
    } catch (e) {
      toast(errMsg(e), 'err');
    }
  }

  async function startShift() {
    setBusy(true);
    try {
      setShift((await api('/shifts/start', { method: 'POST', body: { openingCash: Number(opening) || 0 } })).shift);
      toast('Shift started');
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function cashMove() {
    if (!shift || !(Number(moveAmt) > 0)) return;
    setBusy(true);
    try {
      setShift((await api(`/shifts/${shift.id}/cash-movement`, { method: 'POST', body: { type: moveType, amount: Number(moveAmt) } })).shift);
      setMoveAmt('');
      toast('Cash movement recorded');
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function reconcile() {
    setBusy(true);
    try {
      setShift((await api(`/shifts/${shift.id}/reconcile`, { method: 'POST', body: { actualCash: Number(actualCash) } })).shift);
      toast('Reconciliation calculated');
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function lockShift() {
    if (!window.confirm('Lock this shift? This cannot be undone.')) return;
    setBusy(true);
    try {
      setShift((await api(`/shifts/${shift.id}/lock`, { method: 'POST' })).shift);
      toast('Shift locked');
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  const exportUrl = startDate && endDate
    ? `/reports/export.csv?startDate=${startDate}&endDate=${endDate}`
    : `/reports/export.csv?date=${date || getTodayStr()}`;
  const exportFilename = startDate && endDate
    ? `sales-${startDate}_to_${endDate}.csv`
    : `sales-${date || 'today'}.csv`;

  return (
    <div>
      <div className="row between wrap">
        <h2>Daily Sales & Shift Summary {r ? `• ${r.date}` : ''}</h2>
        <div className="row wrap">
          <div className="tabs">
            <button className={`tab ${preset === 'today' ? 'on' : ''}`} onClick={() => selectPreset('today')}>
              Today
            </button>
            <button className={`tab ${preset === 'yesterday' ? 'on' : ''}`} onClick={() => selectPreset('yesterday')}>
              Yesterday
            </button>
            <button className={`tab ${preset === '7days' ? 'on' : ''}`} onClick={() => selectPreset('7days')}>
              Last 7 Days
            </button>
            <button className={`tab ${preset === 'custom' ? 'on' : ''}`} onClick={() => setPreset('custom')}>
              Custom
            </button>
          </div>
          {preset === 'custom' ? (
            <div className="row wrap">
              <label className="row small">
                From <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="row small">
                To <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
          ) : (
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setPreset('custom');
                setDate(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
            />
          )}
          <button className="btn sm" onClick={() => setExportOpen(true)}>
            Export CSV
          </button>
          <button className="btn sm primary" onClick={() => window.print()}>
            Print Summary (Z-Report)
          </button>
        </div>
      </div>

      {/* Modern Dashboard Section Navigation Tabs */}
      <div className="dashboard-section-tabs no-print" role="tablist">
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          📊 Sales &amp; Analytics
        </button>
        {canShift && (
          <button
            type="button"
            className={`dash-sec-tab ${activeSection === 'shift' ? 'active' : ''}`}
            onClick={() => setActiveSection('shift')}
          >
            💼 Shift Register &amp; Cash
          </button>
        )}
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveSection('orders')}
        >
          📋 Recent Orders ({r?.recentOrders?.length || 0})
        </button>
        {canManage && (
          <button
            type="button"
            className={`dash-sec-tab ${activeSection === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveSection('audit')}
          >
            🛡️ Audit Log ({audit?.length || 0})
          </button>
        )}
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSection('all')}
          title="Show complete dashboard view with all sections"
        >
          📑 Complete Summary
        </button>
      </div>

      {err && <ErrorBox message={err} onRetry={load} />}

      {!r ? (
        !err && <Spinner />
      ) : (
        <>
          {/* Section 1: Sales Metrics & Performance */}
          <div className={`dash-section-pane ${activeSection === 'overview' || activeSection === 'all' ? 'visible' : 'hidden'}`}>
            <SalesMetricsCards report={r} />

            {r.topItems && r.topItems.length > 0 && (
              <div className="card top-items-card" style={{ marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
                <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>🏆 Highest Sold Food Items Ranking</h3>
                    <p className="muted small" style={{ margin: '2px 0 0' }}>
                      Ranked by total quantity ordered and revenue generated
                    </p>
                  </div>
                  <span className="badge st-completed">#1 Top Seller: {r.topItems[0].name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                  {r.topItems.map((item, idx) => (
                    <div
                      key={item.name}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: idx === 0 ? '1.5px solid #f59e0b' : '1px solid var(--border-light)',
                        background: idx === 0 ? '#fffdf0' : 'var(--surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: idx === 0 ? '0 2px 6px rgba(217, 119, 6, 0.15)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: idx === 0 ? '#b45309' : 'var(--muted)',
                              fontSize: '0.84rem',
                              background: idx === 0 ? '#fef3c7' : 'rgba(0,0,0,0.04)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <b style={{ color: 'var(--espresso)', fontSize: '0.88rem' }}>{item.name}</b>
                        </div>
                        <span className="small muted">{item.quantity} orders placed</span>
                      </div>
                      <b style={{ color: idx === 0 ? '#b45309' : 'var(--ink)', fontSize: '0.94rem' }}>
                        {money(item.revenue)}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="two">
              <div className="card">
                <h3>Hourly revenue</h3>
                {r.netSales === 0 ? (
                  <Empty>No paid orders for this period.</Empty>
                ) : (
                  <HourlyRevenueChart hourly={r.hourly} />
                )}
              </div>
              <CollectionsMix report={r} />
            </div>
          </div>

          {/* Section 2: Shift Reconciliation & Float Management */}
          {canShift && (
            <div className={`dash-section-pane ${activeSection === 'shift' || activeSection === 'all' ? 'visible' : 'hidden'}`}>
              <ShiftReconciliation
                shift={shift}
                opening={opening}
                setOpening={setOpening}
                moveType={moveType}
                setMoveType={setMoveType}
                moveAmt={moveAmt}
                setMoveAmt={setMoveAmt}
                actualCash={actualCash}
                setActualCash={setActualCash}
                busy={busy}
                canManage={canManage}
                onStartShift={startShift}
                onCashMove={cashMove}
                onReconcile={reconcile}
                onLockShift={lockShift}
              />
            </div>
          )}

          {/* Section 3: Recent Orders Table */}
          <div className={`dash-section-pane ${activeSection === 'orders' || activeSection === 'all' ? 'visible' : 'hidden'}`}>
            <RecentOrdersTable orders={r.recentOrders} onOpenBill={openBill} />
          </div>

          {/* Section 4: Audit Trail Table */}
          {canManage && (
            <div className={`dash-section-pane ${activeSection === 'audit' || activeSection === 'all' ? 'visible' : 'hidden'}`}>
              <AuditLogTable audit={audit} />
            </div>
          )}
        </>
      )}

      {bill && <BillModal order={bill} onClose={() => setBill(null)} />}
      {exportOpen && (
        <ExportCsvModal
          date={date}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
