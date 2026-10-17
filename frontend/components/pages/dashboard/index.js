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
import EmployeePerformanceLeaderboard from './EmployeePerformanceLeaderboard';
import FoodRankingCard from './FoodRankingCard';
import FrequentCustomersCard from './FrequentCustomersCard';
import SalesGraphsView from './SalesGraphsView';
import OrgStockOverviewCard from './OrgStockOverviewCard';

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
        api(`/reports/audit?limit=50`).then((a) => setAudit(a.data)).catch(() => setAudit([]));
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
    } else if (p === '30days') {
      setDate('');
      setStartDate(getPrevDayStr(29));
      setEndDate(getTodayStr());
    } else if (p === 'thisMonth') {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setDate('');
      setStartDate(first);
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
        <h2>Daily Sales &amp; Shift Summary {r ? `• ${r.date}` : ''}</h2>
        <div className="row wrap" style={{ alignItems: 'center', gap: '6px' }}>
          <div className="tabs" style={{ margin: 0 }}>
            <button className={`tab ${preset === 'today' ? 'on' : ''}`} onClick={() => selectPreset('today')}>
              Today
            </button>
            <button className={`tab ${preset === 'yesterday' ? 'on' : ''}`} onClick={() => selectPreset('yesterday')}>
              Yesterday
            </button>
            <button className={`tab ${preset === '7days' ? 'on' : ''}`} onClick={() => selectPreset('7days')}>
              7 Days
            </button>
            <button className={`tab ${preset === '30days' ? 'on' : ''}`} onClick={() => selectPreset('30days')}>
              30 Days
            </button>
            <button className={`tab ${preset === 'thisMonth' ? 'on' : ''}`} onClick={() => selectPreset('thisMonth')}>
              This Month
            </button>
            <button className={`tab ${preset === 'custom' ? 'on' : ''}`} onClick={() => setPreset('custom')}>
              Custom
            </button>
          </div>
          {preset === 'custom' ? (
            <div className="row wrap" style={{ alignItems: 'center', gap: '6px' }}>
              <label className="row small" style={{ gap: '4px', margin: 0 }}>
                From <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ height: '34px', fontSize: '0.84rem' }} />
              </label>
              <label className="row small" style={{ gap: '4px', margin: 0 }}>
                To <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ height: '34px', fontSize: '0.84rem' }} />
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
              style={{ height: '34px', fontSize: '0.84rem' }}
              title="Pick a single date"
            />
          )}
          {preset !== 'today' && (
            <button
              type="button"
              className="btn sm"
              onClick={() => selectPreset('today')}
              title="Reset date filter to today"
              style={{ height: '34px' }}
            >
              Today ↺
            </button>
          )}
          <button className="btn sm" onClick={() => setExportOpen(true)} style={{ height: '34px' }}>
            Export CSV
          </button>
          <button className="btn sm primary" onClick={() => window.print()} style={{ height: '34px' }}>
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
          📊 Overview &amp; KPIs
        </button>
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'graphs' ? 'active' : ''}`}
          onClick={() => setActiveSection('graphs')}
        >
          📈 Sales Graphs
        </button>
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'products' ? 'active' : ''}`}
          onClick={() => setActiveSection('products')}
        >
          🏆 Most Sold Dishes
        </button>
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveSection('customers')}
        >
          👑 Frequent Customers
        </button>
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'stocks' ? 'active' : ''}`}
          onClick={() => setActiveSection('stocks')}
        >
          📦 Org Stock Assets
        </button>
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveSection('performance')}
        >
          👥 Staff Performance
        </button>
        {canShift && (
          <button
            type="button"
            className={`dash-sec-tab ${activeSection === 'shift' ? 'active' : ''}`}
            onClick={() => setActiveSection('shift')}
          >
            💼 Shift Cash
          </button>
        )}
        <button
          type="button"
          className={`dash-sec-tab ${activeSection === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveSection('orders')}
        >
          📋 Orders ({r?.recentOrders?.length || 0})
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
          📑 Complete View
        </button>
      </div>

      {err && <ErrorBox message={err} onRetry={load} />}

      {!r ? (
        !err && <Spinner />
      ) : (
        <>
          {/* Section: Overview & Key Metrics */}
          <div className={`dash-section-pane ${activeSection === 'overview' || activeSection === 'all' ? 'visible' : 'hidden'}`}>
            <SalesMetricsCards report={r} />
            <OrgStockOverviewCard />
            <SalesGraphsView date={date} startDate={startDate} endDate={endDate} />
            <FoodRankingCard date={date} startDate={startDate} endDate={endDate} />
            <FrequentCustomersCard date={date} startDate={startDate} endDate={endDate} />

            <div className="two">
              <div className="card">
                <h3>Hourly Revenue</h3>
                {r.netSales === 0 ? (
                  <Empty>No paid orders for this period.</Empty>
                ) : (
                  <HourlyRevenueChart hourly={r.hourly} />
                )}
              </div>
              <CollectionsMix report={r} />
            </div>
          </div>

          {/* Section: Sales Graphs & Trends */}
          <div className={`dash-section-pane ${activeSection === 'graphs' ? 'visible' : 'hidden'}`}>
            <SalesGraphsView date={date} startDate={startDate} endDate={endDate} />
            <div className="two">
              <div className="card">
                <h3>Hourly Sales Pattern</h3>
                <HourlyRevenueChart hourly={r.hourly} />
              </div>
              <CollectionsMix report={r} />
            </div>
          </div>

          {/* Section: Food Item Rankings */}
          <div className={`dash-section-pane ${activeSection === 'products' ? 'visible' : 'hidden'}`}>
            <FoodRankingCard date={date} startDate={startDate} endDate={endDate} />
          </div>

          {/* Section: Frequent Regular Customers */}
          <div className={`dash-section-pane ${activeSection === 'customers' ? 'visible' : 'hidden'}`}>
            <FrequentCustomersCard date={date} startDate={startDate} endDate={endDate} />
          </div>

          {/* Section: Organization Stock Overview */}
          <div className={`dash-section-pane ${activeSection === 'stocks' ? 'visible' : 'hidden'}`}>
            <OrgStockOverviewCard />
          </div>

          {/* Section: Shift Reconciliation & Float Management */}
          {canShift && (
            <div className={`dash-section-pane ${activeSection === 'shift' ? 'visible' : 'hidden'}`}>
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

          {/* Section: Employee Performance Leaderboard */}
          <div className={`dash-section-pane ${activeSection === 'performance' ? 'visible' : 'hidden'}`}>
            <EmployeePerformanceLeaderboard date={date} startDate={startDate} endDate={endDate} />
          </div>

          {/* Section: Recent Orders Table */}
          <div className={`dash-section-pane ${activeSection === 'orders' ? 'visible' : 'hidden'}`}>
            <RecentOrdersTable orders={r.recentOrders} onOpenBill={openBill} />
          </div>

          {/* Section: Audit Trail Table */}
          {canManage && (
            <div className={`dash-section-pane ${activeSection === 'audit' ? 'visible' : 'hidden'}`}>
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
