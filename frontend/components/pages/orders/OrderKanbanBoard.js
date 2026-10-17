'use client';
import { Empty } from '@/components/shared/ui';
import OrderCard from './OrderCard';
import { ORDER_COLS } from './OrderHeaderFilters';

export default function OrderKanbanBoard({
  visibleCols = ORDER_COLS,
  grouped,
  isStaff = false,
  acting,
  canCashier,
  canManage,
  isKitchen,
  onMove,
  onOpenBill,
  onOpenPay,
  onOpenReturn,
  onAcceptDelivery,
  onDeliver,
}) {
  return (
    <div className={`board ${visibleCols.length === 1 ? 'single-col' : ''}`}>
      {visibleCols.map((c) => (
        <div key={c.key} className={`col col-${c.key}`}>
          <div className="col-head">
            <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
              {c.icon && <span style={{ fontSize: '1.1rem' }}>{c.icon}</span>}
              <b>{c.title}</b>
            </div>
            <span
              className="badge"
              style={{
                background: c.bg || 'var(--bg-cream-light)',
                color: c.color || 'var(--ink)',
                border: c.color ? `1px solid ${c.color}33` : '1px solid var(--border-light)',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {grouped[c.key]?.length || 0}
            </span>
          </div>

          {(!grouped[c.key] || grouped[c.key].length === 0) && <Empty>No orders</Empty>}

          {grouped[c.key]?.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              isStaff={isStaff}
              acting={acting}
              canCashier={canCashier}
              canManage={canManage}
              isKitchen={isKitchen}
              onMove={onMove}
              onOpenBill={onOpenBill}
              onOpenPay={onOpenPay}
              onOpenReturn={onOpenReturn}
              onAcceptDelivery={onAcceptDelivery}
              onDeliver={onDeliver}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
