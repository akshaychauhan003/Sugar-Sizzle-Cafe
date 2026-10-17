'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { ErrorBox, Spinner } from '@/components/shared/ui';
import KitchenBoard from './KitchenBoard';
import StockManager from '@/components/shared/StockManager';

export default function KitchenPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'stocks'
  const [tickets, setTickets] = useState(null);
  const [err, setErr] = useState('');
  const [acting, setActing] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    try {
      setTickets((await api('/kitchen/tickets')).data);
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 6000);
    return () => clearInterval(i);
  }, [load]);

  const grouped = useMemo(() => {
    const g = { pending: [], in_progress: [], ready: [] };
    (tickets || []).forEach((t) => (g[t.status] || g.pending).push(t));
    return g;
  }, [tickets]);

  async function setItem(ticket, item, prepStatus) {
    const id = String(item.id || item._id);
    setActing(id);
    try {
      await api(`/kitchen/tickets/${ticket.id}/items`, {
        method: 'PATCH',
        body: { itemId: id, prepStatus },
      });
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  async function ready(ticket) {
    setActing(ticket.id);
    try {
      await api(`/kitchen/tickets/${ticket.id}/ready`, { method: 'POST' });
      toast(`${ticket.ticketNumber} cooked and marked ready for waitstaff delivery!`);
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  async function saveNotes(ticket) {
    setActing(`n-${ticket.id}`);
    try {
      await api(`/kitchen/tickets/${ticket.id}/notes`, {
        method: 'PATCH',
        body: { kitchenNotes: notes[ticket.id] ?? ticket.kitchenNotes },
      });
      toast('Notes saved');
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  return (
    <div>
      <div className="row between wrap" style={{ alignItems: 'center' }}>
        <div>
          <h2>Kitchen Display &amp; Chef Workstation</h2>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Live kitchen ticket queue &amp; ingredient stock expiry tracker
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="row" style={{ gap: '6px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'orders' ? 'primary' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            🍳 Orders to Cook ({(grouped.pending.length + grouped.in_progress.length)})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'stocks' ? 'primary' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            📦 Stock Details &amp; Expiry
          </button>
          {activeTab === 'orders' && (
            <button className="btn" onClick={load}>
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {activeTab === 'stocks' ? (
        <StockManager role="kitchen" />
      ) : (
        <>
          {err && <ErrorBox message={err} onRetry={load} />}
          {!tickets ? (
            <Spinner />
          ) : (
            <KitchenBoard
              grouped={grouped}
              acting={acting}
              notes={notes}
              setNotes={setNotes}
              onSetItem={setItem}
              onReady={ready}
              onSaveNotes={saveNotes}
            />
          )}
        </>
      )}
    </div>
  );
}
