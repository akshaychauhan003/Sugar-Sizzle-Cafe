'use client';
import { useMemo, useState, useEffect } from 'react';
import { api, errMsg, money, timeAgo } from '@/lib/api';
import { Empty, Spinner } from '@/components/shared/ui';

export default function FrequentCustomersCard({ date, startDate, endDate }) {
  const [customers, setCustomers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Sorting & Filtering State
  const [q, setQ] = useState('');
  const [freqFilter, setFreqFilter] = useState('all'); // 'all' | 'vip' | 'frequent' | 'occasional'
  const [sortBy, setSortBy] = useState('visits'); // 'visits' | 'spent' | 'avg' | 'name' | 'lastVisit'
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

    api(`/reports/top-customers?${p}`)
      .then((res) => {
        if (active) {
          setCustomers(res.customers || []);
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

  const filteredAndSorted = useMemo(() => {
    let list = [...(customers || [])];

    // Search filter
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter((c) =>
        (c.customerName || '').toLowerCase().includes(term) ||
        (c.favoriteDish || '').toLowerCase().includes(term)
      );
    }

    // Frequency filter
    if (freqFilter === 'vip') {
      list = list.filter((c) => (c.visits || 0) >= 5);
    } else if (freqFilter === 'frequent') {
      list = list.filter((c) => (c.visits || 0) >= 3);
    } else if (freqFilter === 'occasional') {
      list = list.filter((c) => (c.visits || 0) <= 2);
    }

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'visits') {
        cmp = (a.visits || 0) - (b.visits || 0);
      } else if (sortBy === 'spent') {
        cmp = (a.totalSpent || 0) - (b.totalSpent || 0);
      } else if (sortBy === 'avg') {
        cmp = (a.averageOrderValue || 0) - (b.averageOrderValue || 0);
      } else if (sortBy === 'name') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '');
      } else if (sortBy === 'lastVisit') {
        const da = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const db = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        cmp = da - db;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [customers, q, freqFilter, sortBy, sortDir]);

  if (loading && !customers) return <Spinner />;
  if (err) return <div className="card text-danger small">Failed to load top customers: {err}</div>;

  const topCustomer = customers && customers.length > 0 ? customers[0] : null;
  const hasFilters = q || freqFilter !== 'all' || sortBy !== 'visits' || sortDir !== 'desc';

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
    return <span style={{ color: '#8b5cf6', marginLeft: '4px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #8b5cf6' }}>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>👑 Customer Loyalty &amp; Frequency Leaderboard</h3>
            <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', fontWeight: 700 }}>
              {filteredAndSorted.length} Regulars
            </span>
          </div>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Customers ranked by total visits, loyalty order volume, lifetime spend, and favorite dishes
          </p>
        </div>

        {topCustomer && (
          <div
            className="row"
            style={{
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              background: '#f5f3ff',
              borderRadius: '999px',
              border: '1px solid #ddd6fe',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🥇</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#5b21b6' }}>
                Top Regular: {topCustomer.customerName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#7c3aed' }}>
                {topCustomer.visits} visits • {money(topCustomer.totalSpent)} total spend
              </div>
            </div>
          </div>
        )}
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
            placeholder="🔍 Search customer or favorite dish…"
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

        {/* Frequency Tier Filter */}
        <select
          value={freqFilter}
          onChange={(e) => setFreqFilter(e.target.value)}
          style={{ height: '36px', fontSize: '0.84rem' }}
          title="Filter by frequency category"
        >
          <option value="all">👥 All Regulars</option>
          <option value="vip">💎 VIPs (≥ 5 visits)</option>
          <option value="frequent">⭐ Frequent (≥ 3 visits)</option>
          <option value="occasional">🌱 Occasional (1-2 visits)</option>
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
          <option value="visits-desc">🏆 Most Visits First</option>
          <option value="visits-asc">📉 Least Visits First</option>
          <option value="spent-desc">💰 Highest Total Spend</option>
          <option value="spent-asc">🪙 Lowest Total Spend</option>
          <option value="avg-desc">🧾 Highest Avg Ticket</option>
          <option value="lastVisit-desc">🕒 Most Recent Visit</option>
          <option value="name-asc">🔤 Customer Name (A-Z)</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setQ('');
              setFreqFilter('all');
              setSortBy('visits');
              setSortDir('desc');
            }}
            style={{ height: '36px', fontSize: '0.82rem' }}
          >
            ✕ Reset
          </button>
        )}
      </div>

      {!filteredAndSorted || filteredAndSorted.length === 0 ? (
        <Empty>No regular customers match your filter criteria.</Empty>
      ) : (
        <div className="tablewrap" style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%', minWidth: '680px' }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Rank</th>
                <th
                  onClick={() => handleHeaderSort('name')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Customer Name{sortArrow('name')}
                </th>
                <th
                  style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('visits')}
                >
                  Total Visits{sortArrow('visits')}
                </th>
                <th
                  style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('spent')}
                >
                  Total Spent{sortArrow('spent')}
                </th>
                <th
                  style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('avg')}
                >
                  Avg Ticket{sortArrow('avg')}
                </th>
                <th>Favorite Dish</th>
                <th
                  style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleHeaderSort('lastVisit')}
                >
                  Last Visit{sortArrow('lastVisit')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((c, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return (
                  <tr key={c.customerName}>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {medal}
                    </td>
                    <td>
                      <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: idx === 0 ? '#fef3c7' : '#f1f5f9',
                            color: idx === 0 ? '#b45309' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {c.customerName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <b style={{ color: 'var(--coffee-dark)' }}>{c.customerName}</b>
                          {c.visits >= 5 && (
                            <span
                              className="badge"
                              style={{
                                marginLeft: '6px',
                                background: '#fef3c7',
                                color: '#92400e',
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                              }}
                            >
                              Top VIP
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          background: idx === 0 ? '#ecfdf5' : '#f3f4f6',
                          color: idx === 0 ? '#047857' : '#374151',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '999px',
                        }}
                      >
                        {c.visits} {c.visits === 1 ? 'order' : 'visits'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>
                      {money(c.totalSpent)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--ink-light)', fontSize: '0.88rem' }}>
                      {money(c.averageOrderValue)}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: 'var(--bg-cream-light)',
                          color: 'var(--coffee-dark)',
                          border: '1px solid var(--border-light)',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                        }}
                      >
                        🍽️ {c.favoriteDish} ({c.favoriteQty}×)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {c.lastVisit ? timeAgo(c.lastVisit) : 'N/A'}
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
