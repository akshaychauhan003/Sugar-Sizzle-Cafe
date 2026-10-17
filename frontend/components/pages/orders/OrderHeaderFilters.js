'use client';

export const ORDER_COLS = [
  { key: 'pending', title: 'Pending Orders', icon: '⏳', color: '#b45309', bg: '#fef3c7' },
  { key: 'preparing', title: 'Cooking in Kitchen', icon: '🍳', color: '#c2410c', bg: '#ffedd5' },
  { key: 'ready', title: 'Ready for Pickup', icon: '🛎️', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'delivered', title: 'Delivered to Table', icon: '🚚', color: '#047857', bg: '#d1fae5' },
  { key: 'completed', title: 'Completed & Paid', icon: '✅', color: '#475569', bg: '#f1f5f9' },
];

export const STAFF_ORDER_COLS = [
  { key: 'ready', title: 'Ready for Pickup', icon: '🛎️', color: '#0369a1', bg: '#e0f2fe' },
  { key: 'preparing', title: 'Cooking in Kitchen', icon: '🍳', color: '#c2410c', bg: '#ffedd5' },
];

export default function OrderHeaderFilters({
  q,
  setQ,
  typeF,
  setTypeF,
  colTab,
  setColTab,
  stats,
  ordersCount,
  grouped,
  onRefresh,
  isStaff = false,
  tableStats = null,
}) {
  const tabCols = isStaff ? STAFF_ORDER_COLS : ORDER_COLS;
  const allCount = isStaff ? ((grouped.ready?.length || 0) + (grouped.preparing?.length || 0)) : ordersCount;

  return (
    <div className="orders-header-card">
      {/* Top Title & Quick Filters Row */}
      <div className="orders-header-top">
        <div className="orders-title-group">
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0 }}>
              {isStaff ? '🛎️ Table Delivery Station & Service Queue' : 'Orders Flow & Kitchen Queue'}
            </h2>
            <span className="live-pulse-badge">
              <span className="live-dot" />
              {isStaff ? `${stats.ready} Ready to Deliver` : `${stats.live} Active Orders`}
            </span>
          </div>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            {isStaff
              ? `Live delivery queue • Auto-syncing every 8s • ${stats.ready} cooked orders ready for table service • ${grouped.preparing?.length || 0} currently cooking`
              : `Live status stream • Auto-syncing every 8s • ${stats.waiting} waiting in queue • ${stats.ready} ready to serve`}
          </p>
        </div>

        <div className="orders-controls-group">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="order-search-input"
              placeholder={isStaff ? 'Search by order #, table…' : 'Search by order #, customer, table…'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search orders"
            />
            {q && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQ('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="order-type-select"
            value={typeF}
            onChange={(e) => setTypeF(e.target.value)}
            aria-label="Filter by order type"
          >
            <option value="">All Dining Types</option>
            <option value="dine-in">🍽️ Dine-In Only</option>
            <option value="takeaway">🛍️ Takeaway (To-Go)</option>
          </select>

          <button
            type="button"
            className="btn refresh-action-btn"
            onClick={onRefresh}
            title="Refresh order stream"
          >
            <span className="refresh-icon">↻</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Styled Segmented Filter Tabs Strip */}
      <div className="orders-tabs-strip">
        <div className="segmented-tab-bar" role="tablist">
          <button
            type="button"
            className={`seg-tab ${colTab === 'all' ? 'active' : ''}`}
            onClick={() => setColTab('all')}
          >
            <span className="tab-label">{isStaff ? 'All Delivery Queue' : 'All Orders'}</span>
            <span className="tab-pill-badge">{allCount}</span>
          </button>

          {tabCols.map((c) => {
            const count = grouped[c.key]?.length || 0;
            const isSelected = colTab === c.key;
            return (
              <button
                key={c.key}
                type="button"
                className={`seg-tab ${isSelected ? 'active' : ''}`}
                onClick={() => setColTab(c.key)}
                style={isSelected ? { borderColor: c.color, color: c.color } : {}}
              >
                <span className="tab-icon">{c.icon}</span>
                <span className="tab-label">{c.title}</span>
                <span
                  className="tab-pill-badge"
                  style={
                    isSelected
                      ? { background: c.color, color: '#ffffff' }
                      : count > 0
                      ? { background: c.bg, color: c.color }
                      : {}
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Dedicated Waitstaff Table Turnover & Cleaning Tab */}
          <button
            type="button"
            className={`seg-tab ${colTab === 'turnover' ? 'active' : ''}`}
            onClick={() => setColTab('turnover')}
            style={colTab === 'turnover' ? { borderColor: '#d97706', color: '#b45309' } : {}}
          >
            <span className="tab-icon">🧹</span>
            <span className="tab-label">{isStaff ? 'Table Turnover & Cleaning' : 'Tables Floor View'}</span>
            {tableStats && (tableStats.cleaning > 0 || tableStats.occupied > 0) && (
              <span
                className="tab-pill-badge"
                style={
                  colTab === 'turnover'
                    ? { background: '#d97706', color: '#ffffff' }
                    : tableStats.cleaning > 0
                    ? { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }
                    : { background: '#fee2e2', color: '#b91c1c' }
                }
              >
                {tableStats.cleaning > 0 ? `${tableStats.cleaning} to clean` : `${tableStats.occupied} dining`}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
