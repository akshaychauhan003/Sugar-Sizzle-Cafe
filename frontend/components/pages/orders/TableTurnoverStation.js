'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { ErrorBox, Spinner } from '@/components/shared/ui';

export default function TableTurnoverStation({ isStaff = false }) {
  const toast = useToast();
  const [tables, setTables] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [actingTableId, setActingTableId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'occupied' | 'cleaning' | 'available'
  const [sectionFilter, setSectionFilter] = useState('all');

  const loadTables = useCallback(async () => {
    try {
      const res = await api('/tables');
      setTables(res.data || []);
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 5000);
    return () => clearInterval(interval);
  }, [loadTables]);

  const handleCustomerLeft = async (t) => {
    setActingTableId(t.id);
    try {
      await api(`/tables/${t.id}/customer-left`, { method: 'POST' });
      toast(`Customer confirmed left Table ${t.code}. Marked for cleaning!`);
      await loadTables();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActingTableId('');
    }
  };

  const handleTableCleaned = async (t) => {
    setActingTableId(t.id);
    try {
      await api(`/tables/${t.id}/cleaned`, { method: 'POST' });
      toast(`Table ${t.code} cleaned & ready! Now visible to Cashier for next guest.`);
      await loadTables();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActingTableId('');
    }
  };

  const stats = useMemo(() => {
    const list = tables || [];
    return {
      total: list.length,
      available: list.filter((t) => t.status === 'available').length,
      occupied: list.filter((t) => t.status === 'occupied').length,
      cleaning: list.filter((t) => t.status === 'cleaning').length,
      reserved: list.filter((t) => t.status === 'reserved').length,
    };
  }, [tables]);

  const sections = useMemo(() => {
    if (!tables) return ['all'];
    const s = [...new Set(tables.map((t) => t.section).filter(Boolean))];
    return ['all', ...s];
  }, [tables]);

  const filtered = useMemo(() => {
    if (!tables) return [];
    return tables.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (sectionFilter !== 'all' && t.section !== sectionFilter) return false;
      return true;
    });
  }, [tables, statusFilter, sectionFilter]);

  if (loading && !tables) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="table-turnover-station">
      {/* Station Summary Banner */}
      <div className="turnover-summary-bar">
        <div className="turnover-summary-title">
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--coffee-dark)' }}>
              🧹 Waitstaff Table Turnover &amp; Cleaning Station
            </h3>
            <span className="live-pulse-badge">
              <span className="live-dot" /> Live Floor Status
            </span>
          </div>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Confirm customer departure when guests leave table, then clean &amp; sanitize table to make it available for the Cashier.
          </p>
        </div>

        {/* Live metric cards */}
        <div className="turnover-stat-pills">
          <button
            type="button"
            className={`stat-pill-btn pill-cleaning ${statusFilter === 'cleaning' ? 'active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'cleaning' ? 'all' : 'cleaning'))}
            title="Filter by tables that need cleaning"
          >
            <span className="stat-pill-icon">🟡</span>
            <div className="stat-pill-text">
              <span className="stat-pill-num">{stats.cleaning}</span>
              <span className="stat-pill-lbl">Needs Cleaning</span>
            </div>
            {stats.cleaning > 0 && <span className="urgent-badge">Needs Attention</span>}
          </button>

          <button
            type="button"
            className={`stat-pill-btn pill-occupied ${statusFilter === 'occupied' ? 'active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'occupied' ? 'all' : 'cleaning'))}
            title="Filter by occupied tables"
          >
            <span className="stat-pill-icon">🔴</span>
            <div className="stat-pill-text">
              <span className="stat-pill-num">{stats.occupied}</span>
              <span className="stat-pill-lbl">Guests Dining</span>
            </div>
          </button>

          <button
            type="button"
            className={`stat-pill-btn pill-available ${statusFilter === 'available' ? 'active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'available' ? 'all' : 'available'))}
            title="Filter by available tables"
          >
            <span className="stat-pill-icon">🟢</span>
            <div className="stat-pill-text">
              <span className="stat-pill-num">{stats.available}</span>
              <span className="stat-pill-lbl">Ready for Guests</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filter and Section Bar */}
      <div className="turnover-controls-bar">
        <div className="row wrap" style={{ gap: '8px', alignItems: 'center' }}>
          <span className="muted small font-medium">Filter Status:</span>
          <div className="turnover-filter-tabs">
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Tables ({stats.total})
            </button>
            <button
              type="button"
              className={`filter-chip chip-cleaning ${statusFilter === 'cleaning' ? 'active' : ''}`}
              onClick={() => setStatusFilter('cleaning')}
            >
              🟡 Needs Cleaning ({stats.cleaning})
            </button>
            <button
              type="button"
              className={`filter-chip chip-occupied ${statusFilter === 'occupied' ? 'active' : ''}`}
              onClick={() => setStatusFilter('occupied')}
            >
              🔴 Guests Dining ({stats.occupied})
            </button>
            <button
              type="button"
              className={`filter-chip chip-available ${statusFilter === 'available' ? 'active' : ''}`}
              onClick={() => setStatusFilter('available')}
            >
              🟢 Clean &amp; Ready ({stats.available})
            </button>
          </div>
        </div>

        {sections.length > 2 && (
          <div className="row" style={{ gap: '6px', alignItems: 'center' }}>
            <span className="muted small font-medium">Section:</span>
            <select
              className="table-section-select"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Sections' : `${s} Section`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {err && <ErrorBox message={err} onRetry={loadTables} />}

      {/* Table Cards Floor Grid */}
      <div className="turnover-grid">
        {filtered.map((t) => {
          const isOccupied = t.status === 'occupied';
          const isCleaning = t.status === 'cleaning';
          const isAvailable = t.status === 'available';
          const isActing = actingTableId === t.id;
          const order = t.currentOrder;

          let cardBorderClass = 'card-available';
          if (isCleaning) cardBorderClass = 'card-cleaning';
          if (isOccupied) cardBorderClass = 'card-occupied';

          return (
            <div key={t.id} className={`turnover-card ${cardBorderClass}`}>
              {/* Card Header */}
              <div className="row between turnover-card-header">
                <div>
                  <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                    <h4 className="turnover-table-code">Table {t.code}</h4>
                    <span className="table-capacity-pill">👥 {t.capacity} Seats</span>
                  </div>
                  <span className="muted small">
                    {t.section || 'Main'} {t.location ? `• ${t.location}` : ''}
                  </span>
                </div>

                {/* Status Badge */}
                <div>
                  {isOccupied && (
                    <span className="turnover-status-badge badge-occupied">
                      <span className="dot dot-red" />
                      Guests Dining
                    </span>
                  )}
                  {isCleaning && (
                    <span className="turnover-status-badge badge-cleaning">
                      <span className="dot dot-yellow" />
                      Needs Cleaning
                    </span>
                  )}
                  {isAvailable && (
                    <span className="turnover-status-badge badge-available">
                      <span className="dot dot-green" />
                      Clean &amp; Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Order or Dining Context */}
              <div className="turnover-card-body">
                {isOccupied && (
                  <div className="occupied-info-box">
                    <div className="row between" style={{ marginBottom: '4px' }}>
                      <span className="font-semibold text-coffee">
                        {order?.orderNumber ? order.orderNumber.replace('ORD-', 'Order #') : 'Active Dining Table'}
                      </span>
                      {order?.customerName && (
                        <span className="muted small">Guest: {order.customerName}</span>
                      )}
                    </div>
                    {order?.items && order.items.length > 0 && (
                      <p className="order-items-preview">
                        {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                      </p>
                    )}
                    <p className="turnover-hint-text">
                      Customers are currently eating at this table. Cashier cannot book this table.
                    </p>
                  </div>
                )}

                {isCleaning && (
                  <div className="cleaning-info-box">
                    <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🧹</span>
                      <div>
                        <b>Customer has left the restaurant</b>
                        <p className="muted small" style={{ margin: 0 }}>
                          Table is dirty. Blocked from Cashier until sanitized.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isAvailable && (
                  <div className="available-info-box">
                    <span className="avail-check-icon">✓</span>
                    <div>
                      <b style={{ color: '#047857' }}>Sanitized &amp; Ready</b>
                      <p className="muted small" style={{ margin: 0 }}>
                        Currently visible and bookable for Cashier in POS.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="turnover-card-footer">
                {isOccupied && (
                  <button
                    type="button"
                    className="btn turnover-action-btn btn-customer-left"
                    disabled={isActing}
                    onClick={() => handleCustomerLeft(t)}
                    title="Confirm customer has finished eating and left the restaurant"
                  >
                    {isActing ? (
                      'Updating…'
                    ) : (
                      <>
                        <span>👋 Customer Left</span>
                        <span className="btn-subtext">(Mark for Cleaning)</span>
                      </>
                    )}
                  </button>
                )}

                {isCleaning && (
                  <button
                    type="button"
                    className="btn turnover-action-btn btn-table-cleaned"
                    disabled={isActing}
                    onClick={() => handleTableCleaned(t)}
                    title="Confirm table has been sanitized and is ready for next customer"
                  >
                    {isActing ? (
                      'Updating…'
                    ) : (
                      <>
                        <span>✨ Table Cleaned &amp; Ready</span>
                        <span className="btn-subtext">(Show to Cashier)</span>
                      </>
                    )}
                  </button>
                )}

                {isAvailable && (
                  <div className="row between" style={{ width: '100%', alignItems: 'center' }}>
                    <span className="ready-indicator-text">🟢 Ready for new guests</span>
                    <button
                      type="button"
                      className="btn sm"
                      style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                      disabled={isActing}
                      onClick={() => handleCustomerLeft(t)}
                      title="If table needs re-cleaning, mark for cleaning"
                    >
                      Needs Cleaning
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-turnover-box">
          <span style={{ fontSize: '2.5rem' }}>🍽️</span>
          <b>No tables match selected filter</b>
          <p className="muted small">Change status or section filter above to see other tables.</p>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setStatusFilter('all');
              setSectionFilter('all');
            }}
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
