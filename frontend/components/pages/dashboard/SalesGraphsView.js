'use client';
import { useMemo, useState, useEffect } from 'react';
import { api, errMsg, money } from '@/lib/api';
import { Empty, Spinner } from '@/components/shared/ui';

const CATEGORY_COLORS = [
  '#b45309', // Main Course - Amber
  '#0284c7', // Beverages - Sky blue
  '#059669', // Starters - Emerald
  '#e11d48', // Desserts - Rose
  '#d97706', // Appetizers - Warm yellow
  '#7c3aed', // Pizzas - Violet
  '#475569', // General - Slate
];

export default function SalesGraphsView({ date, startDate, endDate }) {
  const [graphs, setGraphs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [trendMetric, setTrendMetric] = useState('both'); // 'both' | 'revenue' | 'orders'
  const [catSort, setCatSort] = useState('revenue-desc'); // 'revenue-desc' | 'revenue-asc' | 'qty-desc' | 'name-asc'

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

    api(`/reports/sales-graphs?${p}`)
      .then((res) => {
        if (active) {
          setGraphs(res.graphs);
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

  const { dailyTrends = [], categoryBreakdown = [], paymentMix = [], diningSplit = [] } = graphs || {};
  const maxTrendRev = Math.max(...dailyTrends.map((d) => d.revenue), 1);
  const maxTrendOrders = Math.max(...dailyTrends.map((d) => d.orders), 1);

  const sortedCategories = useMemo(() => {
    let list = [...categoryBreakdown];
    list.sort((a, b) => {
      if (catSort === 'revenue-desc') return (b.revenue || 0) - (a.revenue || 0);
      if (catSort === 'revenue-asc') return (a.revenue || 0) - (b.revenue || 0);
      if (catSort === 'qty-desc') return (b.quantity || 0) - (a.quantity || 0);
      if (catSort === 'name-asc') return (a.category || '').localeCompare(b.category || '');
      return 0;
    });
    return list;
  }, [categoryBreakdown, catSort]);

  if (loading && !graphs) return <Spinner />;
  if (err) return <div className="card text-danger small">Failed to load sales graphs: {err}</div>;
  if (!graphs) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
      {/* Graph 1: Multi-Day Sales & Order Volume Trend */}
      <div className="card" style={{ borderLeft: '4px solid #0284c7' }}>
        <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>📈 Multi-Day Sales &amp; Revenue Trend</h3>
            <p className="muted small" style={{ margin: '3px 0 0' }}>
              Daily gross sales and order volume performance over time
            </p>
          </div>
          <div className="row wrap" style={{ gap: '8px', alignItems: 'center' }}>
            <div className="tabs" style={{ margin: 0 }}>
              <button
                type="button"
                className={`tab sm ${trendMetric === 'both' ? 'on' : ''}`}
                onClick={() => setTrendMetric('both')}
              >
                All Metrics
              </button>
              <button
                type="button"
                className={`tab sm ${trendMetric === 'revenue' ? 'on' : ''}`}
                onClick={() => setTrendMetric('revenue')}
              >
                Revenue Only
              </button>
              <button
                type="button"
                className={`tab sm ${trendMetric === 'orders' ? 'on' : ''}`}
                onClick={() => setTrendMetric('orders')}
              >
                Orders Only
              </button>
            </div>
            <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
              {dailyTrends.length} Days Recorded
            </span>
          </div>
        </div>

        {dailyTrends.length === 0 ? (
          <Empty>No daily trend data available for this range.</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${dailyTrends.length}, minmax(0, 1fr))`,
                gap: '12px',
                alignItems: 'end',
                height: '180px',
                padding: '16px 12px 10px',
                background: 'var(--bg-cream-light, #faf6f0)',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
              }}
            >
              {dailyTrends.map((d) => {
                const heightPct = Math.max(12, Math.round((d.revenue / maxTrendRev) * 100));
                const orderHeightPct = Math.max(10, Math.round((d.orders / maxTrendOrders) * 100));
                return (
                  <div
                    key={d.date}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: '6px',
                    }}
                  >
                    {trendMetric !== 'orders' && (
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0369a1' }}>
                        {money(d.revenue)}
                      </span>
                    )}
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '48px',
                        height: trendMetric === 'orders' ? `${orderHeightPct}%` : `${heightPct}%`,
                        background: trendMetric === 'orders'
                          ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                          : 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                        borderRadius: '6px 6px 0 0',
                        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                        transition: 'height 0.3s ease',
                      }}
                      title={`${d.date}: ${money(d.revenue)} across ${d.orders} orders`}
                    />
                    {trendMetric !== 'revenue' && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {d.orders} {d.orders === 1 ? 'ord' : 'ords'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* X-Axis Dates */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${dailyTrends.length}, minmax(0, 1fr))`,
                gap: '12px',
                textAlign: 'center',
              }}
            >
              {dailyTrends.map((d) => (
                <div key={d.date} style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {d.date.slice(5)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Graphs Row 2: Category Breakdown & Payment Methods Share */}
      <div className="two">
        {/* Graph 2: Sales by Food Category Distribution */}
        <div className="card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0 }}>🍽️ Sales by Food Category</h3>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Revenue contribution and quantity by food &amp; beverage segment
              </p>
            </div>
            <select
              value={catSort}
              onChange={(e) => setCatSort(e.target.value)}
              style={{ height: '32px', fontSize: '0.8rem' }}
              title="Sort categories"
            >
              <option value="revenue-desc">💰 Revenue (High to Low)</option>
              <option value="revenue-asc">💰 Revenue (Low to High)</option>
              <option value="qty-desc">📦 Portions Sold (High to Low)</option>
              <option value="name-asc">🔤 Category (A-Z)</option>
            </select>
          </div>

          {sortedCategories.length === 0 ? (
            <Empty>No category data found for this period.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedCategories.map((c, idx) => {
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                return (
                  <div key={c.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="row between" style={{ fontSize: '0.84rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--coffee-dark)' }}>
                        {c.category} ({c.quantity} sold)
                      </span>
                      <span>
                        <b style={{ color }}>{money(c.revenue)}</b>
                        <span className="muted small" style={{ marginLeft: '6px' }}>
                          ({c.percentage}%)
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '10px',
                        background: '#f1f5f9',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, c.percentage)}%`,
                          height: '100%',
                          background: color,
                          borderRadius: '999px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Graph 3: Payment & Dining Distribution */}
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0 }}>💳 Collections &amp; Dining Ratio</h3>
              <p className="muted small" style={{ margin: '2px 0 0' }}>
                Payment methods and Dine-in vs Takeaway share
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Dining Ratio */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--coffee-dark)', marginBottom: '6px' }}>
                Dining Channels (Dine-In vs. Takeaway)
              </div>
              <div className="row" style={{ gap: '8px', marginBottom: '6px' }}>
                {diningSplit.map((d) => (
                  <div
                    key={d.type}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: d.type === 'dine-in' ? '#eff6ff' : '#fef3c7',
                      borderRadius: '8px',
                      border: `1px solid ${d.type === 'dine-in' ? '#bfdbfe' : '#fde68a'}`,
                    }}
                  >
                    <div className="muted small">{d.type === 'dine-in' ? '🍽️ Dine-in' : '🛍️ Takeaway'}</div>
                    <div className="row between" style={{ alignItems: 'baseline', marginTop: '2px' }}>
                      <b style={{ color: d.type === 'dine-in' ? '#1d4ed8' : '#b45309' }}>
                        {d.orders} orders
                      </b>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{d.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Mix */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--coffee-dark)', marginBottom: '6px' }}>
                Payment Method Revenue Share
              </div>
              {paymentMix.length === 0 ? (
                <Empty>No payment data found.</Empty>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {paymentMix.map((p) => (
                    <div key={p.method} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div className="row between" style={{ fontSize: '0.82rem' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {p.method === 'upi' ? '📱 UPI / QR' : p.method === 'card' ? '💳 Card' : '💵 Cash'}
                        </span>
                        <span>
                          <b>{money(p.amount)}</b> <span className="muted">({p.percentage}%)</span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, p.percentage)}%`,
                            height: '100%',
                            background: p.method === 'cash' ? '#10b981' : p.method === 'upi' ? '#8b5cf6' : '#3b82f6',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
