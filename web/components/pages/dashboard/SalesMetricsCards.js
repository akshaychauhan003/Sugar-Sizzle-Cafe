'use client';
import { money } from '@/lib/api';

export default function SalesMetricsCards({ report }) {
  const r = report;
  if (!r) return null;

  const highestSold = r.topItems && r.topItems.length > 0 ? r.topItems[0] : null;

  return (
    <div className="stats">
      {/* Standout Highest Sold Food Item Card */}
      <div className="card stat" style={{ borderLeft: '4px solid #f59e0b', background: '#fffdf5' }}>
        <small style={{ color: '#b45309', fontWeight: 700 }}>🏆 Highest Sold Food Item</small>
        {highestSold ? (
          <>
            <b style={{ color: 'var(--espresso)', fontSize: '1.15rem' }}>{highestSold.name}</b>
            <span className="small" style={{ color: '#92400e', fontWeight: 600 }}>
              {highestSold.quantity} orders sold • {money(highestSold.revenue)} revenue
            </span>
          </>
        ) : (
          <>
            <b>No sales yet</b>
            <span className="muted small">Awaiting completed orders</span>
          </>
        )}
      </div>

      <div className="card stat">
        <small>Total Orders</small>
        <b>{r.totalOrders}</b>
        <span className="muted small">
          {r.activeOrders} active • {r.cancelledOrders} cancelled
        </span>
      </div>
      <div className="card stat">
        <small>Completed Orders</small>
        <b>{r.completedOrders}</b>
      </div>
      <div className="card stat">
        <small>Net Revenue</small>
        <b style={{ color: 'var(--honey)' }}>{money(r.netSales)}</b>
        <span className="muted small">
          {r.paidOrders} paid orders • tax {money(r.taxCollected)}
        </span>
      </div>
      <div className="card stat">
        <small>Average Order Value</small>
        <b>{money(r.averageOrderValue)}</b>
        <span className="muted small">
          discounts {money(r.discountsGiven)}
        </span>
      </div>
      <div className="card stat">
        <small>Payment Status Overview</small>
        <b>{r.byPaymentStatus?.paid || 0} paid</b>
        <span className="muted small">
          {r.byPaymentStatus?.partial || 0} partial • {r.byPaymentStatus?.unpaid || 0} unpaid
        </span>
      </div>
    </div>
  );
}
