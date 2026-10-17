'use client';
import { timeAgo } from '@/lib/api';
import { TypeBadge } from '@/components/shared/ui';

export default function KitchenTicketCard({
  ticket,
  acting,
  notes,
  setNotes,
  onSetItem,
  onReady,
  onSaveNotes,
}) {
  const t = ticket;

  return (
    <article className="card order">
      <div className="row between wrap">
        <b>{t.ticketNumber}</b>
        {t.order && <TypeBadge type={t.order.type} table={t.order.tableNumber} />}
      </div>
      <div className="muted small">
        {t.order?.orderNumber || ''} • {timeAgo(t.createdAt)}
      </div>
      <ul className="items">
        {t.items.map((i) => (
          <li key={i.id || i._id}>
            <span>
              {i.quantity}× {i.name}
              {i.notes ? <em> — {i.notes}</em> : null}
            </span>
            {t.status !== 'ready' ? (
              <select
                value={i.prepStatus}
                disabled={acting === (i.id || i._id)}
                onChange={(e) => onSetItem(t, i, e.target.value)}
                aria-label={`Status for ${i.name}`}
              >
                <option value="pending">Pending</option>
                <option value="preparing">Prep</option>
                <option value="ready">Ready</option>
              </select>
            ) : (
              <span className="badge st-ready">Cooked • Ready for Staff</span>
            )}
          </li>
        ))}
      </ul>
      {t.status !== 'ready' && (
        <>
          <input
            placeholder="Chef / allergen notes…"
            value={notes[t.id] ?? t.kitchenNotes ?? ''}
            onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))}
          />
          <div className="row wrap actions">
            <button
              className="btn sm"
              disabled={acting === `n-${t.id}`}
              onClick={() => onSaveNotes(t)}
            >
              Save Notes
            </button>
            <button
              className="btn sm primary"
              disabled={acting === t.id}
              onClick={() => onReady(t)}
              title="Order cooking complete - sends request to waitstaff for table delivery"
            >
              🍳 Mark Cooked (Send to Staff)
            </button>
          </div>
        </>
      )}
    </article>
  );
}
