'use client';
import { Empty } from '@/components/shared/ui';
import KitchenTicketCard from './KitchenTicketCard';

export const KITCHEN_COLS = [
  { key: 'pending', title: 'Incoming Orders' },
  { key: 'in_progress', title: 'In Preparation' },
  { key: 'ready', title: 'Ready for Service' },
];

export default function KitchenBoard({
  grouped,
  acting,
  notes,
  setNotes,
  onSetItem,
  onReady,
  onSaveNotes,
}) {
  return (
    <div className="board kitchen-board">
      {KITCHEN_COLS.map((c) => (
        <div key={c.key} className="col">
          <div className="col-head">
            <b>{c.title}</b>
            <span className="badge type">{grouped[c.key]?.length || 0}</span>
          </div>
          {(!grouped[c.key] || grouped[c.key].length === 0) && <Empty>No tickets</Empty>}
          {grouped[c.key]?.map((t) => (
            <KitchenTicketCard
              key={t.id}
              ticket={t}
              acting={acting}
              notes={notes}
              setNotes={setNotes}
              onSetItem={onSetItem}
              onReady={onReady}
              onSaveNotes={onSaveNotes}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
