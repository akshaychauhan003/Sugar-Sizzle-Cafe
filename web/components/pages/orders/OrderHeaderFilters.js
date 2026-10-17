'use client';

export const ORDER_COLS = [
  { key: 'pending', title: 'Pending Orders' },
  { key: 'preparing', title: '🍳 Cooking in Kitchen' },
  { key: 'ready', title: '🛎️ Cooked (Ready to Deliver)' },
  { key: 'completed', title: '✅ Delivered to Customer' },
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
}) {
  return (
    <>
      <div className="row between wrap">
        <h2>
          Orders Queue <span className="badge type">{stats.live} active</span>
        </h2>
        <div className="row wrap">
          <input
            placeholder="Search order # or customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search orders"
          />
          <select
            value={typeF}
            onChange={(e) => setTypeF(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="">All Orders</option>
            <option value="dine-in">Dine-In</option>
            <option value="takeaway">Takeaway</option>
          </select>
          <button className="btn" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="row between wrap" style={{ marginBottom: '10px' }}>
        <p className="muted small" style={{ margin: 0 }}>
          Auto-refreshing (8s) • {stats.waiting} pending • {stats.ready} ready
        </p>
        <div className="tabs col-tabs" role="tablist">
          <button
            className={`tab sm ${colTab === 'all' ? 'on' : ''}`}
            onClick={() => setColTab('all')}
          >
            All ({ordersCount})
          </button>
          {ORDER_COLS.map((c) => (
            <button
              key={c.key}
              className={`tab sm ${colTab === c.key ? 'on' : ''}`}
              onClick={() => setColTab(c.key)}
            >
              {c.title} ({grouped[c.key]?.length || 0})
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
