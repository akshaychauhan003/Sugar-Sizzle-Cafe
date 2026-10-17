'use client';
import { money, timeAgo } from '@/lib/api';
import { PayBadge, TypeBadge } from '@/components/shared/ui';

export default function OrderCard({
  order,
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
  const o = order;

  return (
    <article className="card order">
      <div className="row between wrap">
        <b>{o.orderNumber.replace('ORD-', '#')}</b>
        <div className="row" style={{ gap: '4px' }}>
          {o.isReturned && <span className="badge st-cancelled">Returned</span>}
          <TypeBadge type={o.type} table={o.tableNumber} />
        </div>
      </div>
      <div className="muted small">
        {o.customerName ? `Customer: ${o.customerName} • ` : ''}
        {timeAgo(o.createdAt)}
      </div>
      <ul className="items">
        {o.items.map((i) => (
          <li key={i._id || i.id}>
            <span>
              {i.quantity}× {i.name}
              {i.notes ? <em> — {i.notes}</em> : null}
            </span>
            <span>{money(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="row between">
        <PayBadge status={o.paymentStatus} />
        <b>{money(o.total)}</b>
      </div>
      <div className="row wrap actions">
        <button className="btn sm" onClick={() => onOpenBill(o, o.status === 'completed')}>
          {o.status === 'completed' ? 'Receipt' : 'View Bill'}
        </button>

        {o.status === 'pending' && canCashier && (
          <>
            <button
              className="btn sm primary"
              disabled={acting === o.id}
              onClick={() => onMove(o, 'preparing')}
            >
              Send to Kitchen
            </button>
            <button
              className="btn sm danger"
              disabled={acting === o.id}
              onClick={() => onMove(o, 'cancelled')}
            >
              Cancel
            </button>
          </>
        )}

        {o.status === 'preparing' && (
          <span className="badge st-preparing" style={{ fontWeight: 600 }}>
            🍳 Cooking in Kitchen
          </span>
        )}
        {o.status === 'ready' && (
          <div className="row wrap" style={{ gap: '4px' }}>
            <span className="badge st-ready" style={{ fontWeight: 600 }}>
              🛎️ Cooked • Ready for Pickup
            </span>
            {o.acceptedForDeliveryBy && (
              <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                🚚 Accepted
              </span>
            )}
          </div>
        )}
        {o.status === 'delivered' && (
          <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', fontWeight: 600 }}>
            🚚 Delivered to Table
          </span>
        )}

        {o.status === 'preparing' && (canCashier || isKitchen) && (
          <button
            className="btn sm primary"
            disabled={acting === o.id}
            onClick={() => onMove(o, 'ready')}
            title="Mark dish cooking complete and notify waitstaff"
          >
            Mark Cooked (Send to Staff)
          </button>
        )}

        {o.status === 'preparing' && canManage && (
          <button
            className="btn sm danger"
            disabled={acting === o.id}
            onClick={() => onMove(o, 'cancelled')}
          >
            Cancel
          </button>
        )}

        {/* Staff Delivery Actions for Ready Orders */}
        {o.status === 'ready' && canCashier && (
          <>
            {!o.acceptedForDeliveryBy && onAcceptDelivery && (
              <button
                className="btn sm"
                disabled={acting === o.id}
                onClick={() => onAcceptDelivery(o)}
                title="Accept this order for table delivery"
              >
                Accept Delivery
              </button>
            )}
            <button
              className="btn sm primary"
              disabled={acting === o.id}
              onClick={() => onDeliver ? onDeliver(o) : onMove(o, 'delivered')}
              title={`Deliver order to ${o.tableNumber ? `Table ${o.tableNumber}` : 'Customer'}`}
            >
              🚚 Deliver to Table {o.tableNumber ? `(${o.tableNumber})` : ''}
            </button>
          </>
        )}

        {/* Delivered Orders Completion */}
        {o.status === 'delivered' && canCashier && (
          o.paymentStatus === 'paid' ? (
            <button
              className="btn sm primary"
              disabled={acting === o.id}
              onClick={() => onMove(o, 'completed')}
              title="Close and complete this order"
            >
              ✅ Complete &amp; Close Bill
            </button>
          ) : (
            <button
              className="btn sm primary"
              onClick={() => onOpenPay(o)}
              title="Collect remaining payment and complete order"
            >
              Collect Payment &amp; Complete
            </button>
          )
        )}

        {canCashier &&
          o.status !== 'completed' &&
          o.status !== 'cancelled' &&
          o.paymentStatus !== 'paid' && (
            <button className="btn sm" onClick={() => onOpenPay(o)}>
              Record Payment
            </button>
          )}

        {canCashier &&
          o.status === 'completed' &&
          o.paymentStatus === 'paid' &&
          onOpenReturn && (
            <button className="btn sm danger" onClick={() => onOpenReturn(o)}>
              Sales Return
            </button>
          )}
      </div>
    </article>
  );
}
