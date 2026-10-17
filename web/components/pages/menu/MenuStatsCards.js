'use client';

export default function MenuStatsCards({ stats }) {
  return (
    <div className="stats">
      <div className="card stat">
        <small>Total Menu Items</small>
        <b>{stats.total}</b>
      </div>
      <div className="card stat">
        <small>Available Items</small>
        <b style={{ color: 'var(--matcha)' }}>{stats.available}</b>
      </div>
      <div className="card stat">
        <small>Out of Stock</small>
        <b style={{ color: 'var(--chili)' }}>{stats.unavailable}</b>
      </div>
    </div>
  );
}
