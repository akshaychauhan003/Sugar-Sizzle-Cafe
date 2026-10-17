'use client';
import { useMemo, useState, useEffect } from 'react';
import { api, errMsg, money } from '@/lib/api';
import { Empty, Spinner } from '@/components/shared/ui';

export default function FoodRankingCard({ date, startDate, endDate }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // Sorting & Filtering States
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('quantity'); // 'quantity' | 'revenue' | 'name'
  const [sortDir, setSortDir] = useState('desc'); // 'desc' | 'asc'
  const [minQty, setMinQty] = useState('all'); // 'all' | '2' | '5' | '10'
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' | 'table'

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

  const allItems = useMemo(() => {
    if (!data) return [];
    return data.allItems || data.highestByQuantity || [];
  }, [data]);

  const filteredAndSorted = useMemo(() => {
    let list = [...allItems];

    // Search query filter
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter((i) => (i.name || '').toLowerCase().includes(term));
    }

    // Minimum sold portions filter
    if (minQty !== 'all') {
      const min = Number(minQty);
      list = list.filter((i) => i.quantitySold >= min);
    }

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'quantity') {
        cmp = (a.quantitySold || 0) - (b.quantitySold || 0);
      } else if (sortBy === 'revenue') {
        cmp = (a.totalRevenue || 0) - (b.totalRevenue || 0);
      } else if (sortBy === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allItems, q, minQty, sortBy, sortDir]);

  if (loading && !data) return <Spinner />;
  if (err) return <div className="card text-danger small">Failed to load food ranking: {err}</div>;
  if (!data) return null;

  const totalPortions = filteredAndSorted.reduce((s, i) => s + (i.quantitySold || 0), 0);
  const totalRev = filteredAndSorted.reduce((s, i) => s + (i.totalRevenue || 0), 0);
  const hasFilters = q || minQty !== 'all' || sortBy !== 'quantity' || sortDir !== 'desc';

  function handleHeaderSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  }

  return (
    <div className="card" style={{ marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>🏆 Dish Performance &amp; Popularity Ranking</h3>
            <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
              {filteredAndSorted.length} Dishes
            </span>
          </div>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Analyze sales volume and revenue generated across all menu items
          </p>
        </div>

        {filteredAndSorted.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span className="muted small">{totalPortions} portions • </span>
            <b style={{ color: '#b45309' }}>{money(totalRev)}</b>
          </div>
        )}
      </div>

      {/* Sort & Filter Controls Toolbar */}
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
            placeholder="🔍 Search dish name…"
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

        {/* Min Portions Sold Filter */}
        <select
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          style={{ height: '36px', fontSize: '0.84rem' }}
          title="Filter by sales volume"
        >
          <option value="all">🍽️ All Sold Dishes</option>
          <option value="2">≥ 2 portions</option>
          <option value="5">≥ 5 portions</option>
          <option value="10">≥ 10 portions (High Volume)</option>
        </select>

        {/* Sort By Dropdown */}
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [b, d] = e.target.value.split('-');
            setSortBy(b);
            setSortDir(d);
          }}
          style={{ height: '36px', fontSize: '0.84rem' }}
        >
          <option value="quantity-desc">🔥 Highest Volume (Top Sellers)</option>
          <option value="quantity-asc">📉 Lowest Volume (Least Sold)</option>
          <option value="revenue-desc">💰 Highest Revenue First</option>
          <option value="revenue-asc">🪙 Lowest Revenue First</option>
          <option value="name-asc">🔤 Dish Name (A-Z)</option>
          <option value="name-desc">🔤 Dish Name (Z-A)</option>
        </select>

        {/* View Layout Toggle */}
        <div className="tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`tab sm ${viewLayout === 'grid' ? 'on' : ''}`}
            onClick={() => setViewLayout('grid')}
            title="Grid Card View"
          >
            🔲 Cards
          </button>
          <button
            type="button"
            className={`tab sm ${viewLayout === 'table' ? 'on' : ''}`}
            onClick={() => setViewLayout('table')}
            title="Table List View"
          >
            📋 Table
          </button>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setQ('');
              setMinQty('all');
              setSortBy('quantity');
              setSortDir('desc');
            }}
            style={{ height: '36px', fontSize: '0.82rem' }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {!filteredAndSorted || filteredAndSorted.length === 0 ? (
        <Empty>No dishes match your filter criteria.</Empty>
      ) : viewLayout === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {filteredAndSorted.map((item, idx) => {
            const isTop = idx === 0 && sortBy !== 'name' && sortDir === 'desc';
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
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Rank</th>
                <th
                  onClick={() => handleHeaderSort('name')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Dish Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th
                  className="r"
                  onClick={() => handleHeaderSort('quantity')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Portions Sold {sortBy === 'quantity' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th
                  className="r"
                  onClick={() => handleHeaderSort('revenue')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Total Revenue {sortBy === 'revenue' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((item, idx) => (
                <tr key={item.name}>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: idx === 0 ? '#b45309' : 'var(--muted)',
                      }}
                    >
                      #{idx + 1}
                    </span>
                  </td>
                  <td>
                    <b>{item.name}</b>
                  </td>
                  <td className="r">
                    <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                      {item.quantitySold}
                    </span>
                  </td>
                  <td className="r">
                    <b style={{ color: '#047857' }}>{money(item.totalRevenue)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
