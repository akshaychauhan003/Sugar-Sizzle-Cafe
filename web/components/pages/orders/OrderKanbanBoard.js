'use client';
import { Empty } from '@/components/shared/ui';
import OrderCard from './OrderCard';
import { ORDER_COLS } from './OrderHeaderFilters';

export default function OrderKanbanBoard({
  visibleCols = ORDER_COLS,
  grouped,
  acting,
  canCashier,
  canManage,
  isKitchen,
  onMove,
  onOpenBill,
  onOpenPay,
  onOpenReturn,
}) {
  return (
    <div className="board">
      {visibleCols.map((c) => (
        <div key={c.key} className="col">
          <div className="col-head">
            <b>{c.title}</b>
            <span className="badge type">{grouped[c.key]?.length || 0}</span>
          </div>

          {(!grouped[c.key] || grouped[c.key].length === 0) && <Empty>No orders</Empty>}

          {grouped[c.key]?.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              acting={acting}
              canCashier={canCashier}
              canManage={canManage}
              isKitchen={isKitchen}
              onMove={onMove}
              onOpenBill={onOpenBill}
              onOpenPay={onOpenPay}
              onOpenReturn={onOpenReturn}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
