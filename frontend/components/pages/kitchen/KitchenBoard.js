'use client';
import { Empty } from '@/components/shared/ui';
import KitchenTicketCard from './KitchenTicketCard';

export const KITCHEN_COLS = [
  {
    key: 'pending',
    title: 'Pending Food Requests',
    subtitle: 'Orders in queue waiting to be cooked',
    icon: '⏳',
    color: '#b45309',
    bg: '#fef3c7',
  },
  {
    key: 'in_progress',
    title: 'Cooking in Kitchen',
    subtitle: 'Dishes currently active on stove & prep line',
    icon: '🍳',
    color: '#c2410c',
    bg: '#ffedd5',
  },
];

export default function KitchenBoard({
  grouped,
  acting,
  notes,
  setNotes,
  onStartCooking,
  onSetItem,
  onReady,
  onSaveNotes,
}) {
  return (
    <div
      className="board"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(320px, 1fr))',
        gap: '20px',
        alignItems: 'start',
      }}
    >
      {KITCHEN_COLS.map((c) => {
        const tickets = grouped[c.key] || [];
        return (
          <div
            key={c.key}
            className="col"
            style={{
              borderTop: `4px solid ${c.color}`,
              background: '#fcfaf7',
              padding: '16px',
              borderRadius: '12px',
            }}
          >
            <div
              className="col-head"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '10px',
                marginBottom: '8px',
                borderBottom: '1px dashed var(--border-light)',
              }}
            >
              <div>
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                  <b style={{ fontSize: '1.05rem', color: 'var(--coffee-dark)' }}>{c.title}</b>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {c.subtitle}
                </div>
              </div>

              <span
                className="badge"
                style={{
                  background: c.bg,
                  color: c.color,
                  border: `1px solid ${c.color}33`,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '3px 10px',
                  borderRadius: '999px',
                }}
              >
                {tickets.length} {tickets.length === 1 ? 'order' : 'orders'}
              </span>
            </div>

            {tickets.length === 0 ? (
              <Empty>
                {c.key === 'pending'
                  ? 'No pending food requests. Kitchen queue is clear!'
                  : 'Nothing currently cooking on the line.'}
              </Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tickets.map((t) => (
                  <KitchenTicketCard
                    key={t.id}
                    ticket={t}
                    acting={acting}
                    notes={notes}
                    setNotes={setNotes}
                    onStartCooking={onStartCooking}
                    onSetItem={onSetItem}
                    onReady={onReady}
                    onSaveNotes={onSaveNotes}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
