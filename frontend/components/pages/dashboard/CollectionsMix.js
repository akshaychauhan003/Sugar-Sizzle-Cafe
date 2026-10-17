'use client';
import { money } from '@/lib/api';
import { Empty } from '@/components/shared/ui';

export default function CollectionsMix({ report }) {
  const r = report;
  if (!r) return null;

  return (
    <div className="card">
      <h3>Collections & Payment Mix</h3>
      {['cash', 'upi', 'card'].map((m) => (
        <div key={m} className="row between">
          <span>{m.toUpperCase()}</span>
          <b>{money(r.collections?.[m]?.amount)}</b>
        </div>
      ))}
      <hr />
      <div className="row between">
        <span>Dine-In Orders</span>
        <b>{r.byType?.['dine-in'] || 0}</b>
      </div>
      <div className="row between">
        <span>Takeaway Orders</span>
        <b>{r.byType?.takeaway || 0}</b>
      </div>
      <h3>Top Selling Items</h3>
      {(!r.topItems || r.topItems.length === 0) ? (
        <Empty>No sales yet</Empty>
      ) : (
        r.topItems.map((t, i) => (
          <div key={t.name} className="row between">
            <span>{i + 1}. {t.name}</span>
            <b>{t.quantity} • {money(t.revenue)}</b>
          </div>
        ))
      )}
    </div>
  );
}
