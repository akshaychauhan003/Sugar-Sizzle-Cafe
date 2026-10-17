'use client';
import { useEffect, useState } from 'react';
import { api, errMsg, money } from '@/lib/api';
import { Empty, Spinner } from '@/components/shared/ui';

export default function FoodRankingCard({ date, startDate, endDate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('quantity'); // 'quantity' | 'revenue'
  const [view, setView] = useState('highest'); // 'highest' | 'least'

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

    api(`/reports/food-items-ranking?${p}`)
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
  if (err) return <div className="card text-danger small">Failed to load food ranking: {err}</div>;
  if (!data) return null;

  let displayItems = [];
  if (metric === 'quantity') {
    displayItems = view === 'highest' ? data.highestByQuantity : data.leastByQuantity;
  } else {
    displayItems = view === 'highest' ? data.highestByRevenue : data.leastByRevenue;
  }

  return (
    <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0 }}>
            {view === 'highest' ? '🏆 Highest-Selling Dishes' : '📉 Least-Selling Dishes'}
          </h3>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Ranked by {metric === 'quantity' ? 'total volume / quantity sold' : 'gross revenue generated'}
          </p>
        </div>

        {/* View and Metric Selectors */}
        <div className="row wrap" style={{ gap: '6px' }}>
          <div className="tabs" style={{ margin: 0 }}>
            <button
              type="button"
              className={`tab sm ${view === 'highest' ? 'on' : ''}`}
              onClick={() => setView('highest')}
            >
              Top Sellers
            </button>
            <button
              type="button"
              className={`tab sm ${view === 'least' ? 'on' : ''}`}
              onClick={() => setView('least')}
            >
              Least Selling
            </button>
          </div>

          <div className="tabs" style={{ margin: 0 }}>
            <button
              type="button"
              className={`tab sm ${metric === 'quantity' ? 'on' : ''}`}
              onClick={() => setMetric('quantity')}
            >
              By Volume
            </button>
            <button
              type="button"
              className={`tab sm ${metric === 'revenue' ? 'on' : ''}`}
              onClick={() => setMetric('revenue')}
            >
              By Revenue
            </button>
          </div>
        </div>
      </div>

      {!displayItems || displayItems.length === 0 ? (
        <Empty>No dishes recorded for this period.</Empty>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {displayItems.map((item, idx) => {
            const isTop = idx === 0 && view === 'highest';
            return (
              <div
                key={item.name}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: isTop ? '1.5px solid #f59e0b' : '1px solid var(--border-light)',
                  background: isTop ? '#fffdf0' : 'var(--surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isTop ? '0 2px 6px rgba(217, 119, 6, 0.15)' : 'none',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        color: isTop ? '#b45309' : 'var(--muted)',
                        fontSize: '0.84rem',
                        background: isTop ? '#fef3c7' : 'rgba(0,0,0,0.04)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <b style={{ color: 'var(--espresso)', fontSize: '0.88rem' }}>{item.name}</b>
                  </div>
                  <span className="small muted">
                    {item.quantitySold} portions sold
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ color: isTop ? '#b45309' : 'var(--ink)', fontSize: '0.94rem' }}>
                    {money(item.totalRevenue)}
                  </b>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
