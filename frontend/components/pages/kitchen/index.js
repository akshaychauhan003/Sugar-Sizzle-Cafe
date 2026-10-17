'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { ErrorBox, Spinner } from '@/components/shared/ui';
import KitchenBoard from './KitchenBoard';
import ChefStockView from './ChefStockView';

export default function KitchenPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'stocks'
  const [tickets, setTickets] = useState(null);
  const [err, setErr] = useState('');
  const [acting, setActing] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    try {
      // Fetch only pending and cooking tickets (no cooked/ready data)
      setTickets((await api('/kitchen/tickets')).data);
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  // The chef only sees Pending and Cooking tickets (no ready/cooked data)
  const grouped = useMemo(() => {
    const g = { pending: [], in_progress: [] };
    (tickets || []).forEach((t) => {
      if (t.status === 'pending') {
        g.pending.push(t);
      } else if (t.status === 'in_progress') {
        g.in_progress.push(t);
      }
    });
    return g;
  }, [tickets]);

  async function handleStartCooking(ticket) {
    setActing(ticket.id);
    try {
      await api(`/kitchen/tickets/${ticket.id}/start`, { method: 'POST' });
      toast(`Started cooking ${ticket.ticketNumber}`);
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

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
      toast(`${ticket.ticketNumber} marked cooked and dispatched to waitstaff for table delivery!`);
      // Reload tickets - ticket disappears from chef's view as it has been cooked!
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
      toast('Chef notes saved');
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  const activeOrdersCount = grouped.pending.length + grouped.in_progress.length;

  return (
    <div>
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2>Kitchen Display &amp; Chef Workstation</h2>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Live cooking station queue • Ingredient shelf life &amp; stock freshness tracking
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="row wrap" style={{ gap: '8px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'orders' ? 'primary' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            🍳 Food Requests ({activeOrdersCount})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'stocks' ? 'primary' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            📦 Products in Kitchen &amp; Expiry
          </button>
          {activeTab === 'orders' && (
            <button className="btn" onClick={load} title="Refresh live kitchen queue">
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {activeTab === 'stocks' ? (
        <ChefStockView />
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
              onStartCooking={handleStartCooking}
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
