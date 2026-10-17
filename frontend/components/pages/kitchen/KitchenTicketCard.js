'use client';
import { timeAgo } from '@/lib/api';
import { TypeBadge } from '@/components/shared/ui';

export default function KitchenTicketCard({
  ticket,
  acting,
  notes,
  setNotes,
  onStartCooking,
  onSetItem,
  onReady,
  onSaveNotes,
}) {
  const t = ticket;
  const isPending = t.status === 'pending';
  const isCooking = t.status === 'in_progress';

  return (
    <article
      className="card order"
      style={{
        borderLeft: isPending ? '4px solid #b45309' : '4px solid #c2410c',
        boxShadow: isCooking ? '0 4px 12px rgba(194, 65, 12, 0.12)' : 'var(--shadow-sm)',
      }}
    >
      <div className="row between wrap" style={{ alignItems: 'center' }}>
        <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
          <b style={{ fontSize: '1rem', color: 'var(--coffee-dark)' }}>{t.ticketNumber}</b>
          <span
            className="badge"
            style={{
              background: isPending ? '#fef3c7' : '#ffedd5',
              color: isPending ? '#b45309' : '#c2410c',
              fontWeight: 700,
              fontSize: '0.74rem',
            }}
          >
            {isPending ? '⏳ Pending Request' : '🔥 Cooking on Line'}
          </span>
        </div>
        {t.order && <TypeBadge type={t.order.type} table={t.order.tableNumber} />}
      </div>

      <div className="muted small" style={{ marginTop: '2px' }}>
        {t.order?.orderNumber ? `${t.order.orderNumber.replace('ORD-', '#')} • ` : ''}
        {t.order?.customerName ? `Guest: ${t.order.customerName} • ` : ''}
        {timeAgo(t.createdAt)}
      </div>

      {/* Items list with special cooking instructions */}
      <ul className="items" style={{ margin: '8px 0' }}>
        {t.items.map((i) => (
          <li
            key={i.id || i._id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 0',
            }}
          >
            <div>
              <b style={{ color: 'var(--coffee-dark)' }}>
                {i.quantity}× {i.name}
              </b>
              {i.notes && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#b45309',
                    background: '#fef3c7',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '2px',
                    fontWeight: 600,
                  }}
                >
                  📝 Note: {i.notes}
                </div>
              )}
            </div>

            {isCooking && (
              <select
                value={i.prepStatus}
                disabled={acting === (i.id || i._id)}
                onChange={(e) => onSetItem(t, i, e.target.value)}
                aria-label={`Status for ${i.name}`}
                style={{
                  fontSize: '0.78rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  height: '28px',
                  border: '1px solid var(--border-light)',
                  background: i.prepStatus === 'ready' ? '#dcfce7' : i.prepStatus === 'preparing' ? '#ffedd5' : '#ffffff',
                  fontWeight: 600,
                }}
              >
                <option value="pending">Waiting</option>
                <option value="preparing">Cooking</option>
                <option value="ready">Done</option>
              </select>
            )}
          </li>
        ))}
      </ul>

      {/* Actions based on state */}
      {isPending && (
        <div className="row wrap actions" style={{ marginTop: '8px' }}>
          <button
            type="button"
            className="btn primary"
            disabled={acting === t.id}
            onClick={() => onStartCooking(t)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              fontWeight: 700,
              padding: '10px',
              fontSize: '0.9rem',
            }}
          >
            🔥 Start Cooking This Order
          </button>
        </div>
      )}

      {isCooking && (
        <>
          <input
            placeholder="Chef notes (e.g. allergen alerted, extra crispy)…"
            value={notes[t.id] ?? t.kitchenNotes ?? ''}
            onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))}
            style={{ fontSize: '0.82rem', height: '34px', marginBottom: '8px' }}
          />

          <div className="row wrap actions" style={{ gap: '8px' }}>
            <button
              type="button"
              className="btn sm"
              disabled={acting === `n-${t.id}`}
              onClick={() => onSaveNotes(t)}
            >
              Save Notes
            </button>
            <button
              type="button"
              className="btn primary sm"
              disabled={acting === t.id}
              onClick={() => onReady(t)}
              title="Dispatches cooked dish to waitstaff table delivery"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                fontWeight: 700,
              }}
            >
              🛎️ Mark Cooked (Send to Staff)
            </button>
          </div>
        </>
      )}
    </article>
  );
}
