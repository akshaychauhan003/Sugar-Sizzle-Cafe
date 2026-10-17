'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useAuth, useToast } from '@/components/shared/AuthProvider';
import { ErrorBox, Spinner } from '@/components/shared/ui';
import BillModal from '@/components/shared/BillModal';
import OrderHeaderFilters, { ORDER_COLS } from './OrderHeaderFilters';
import OrderKanbanBoard from './OrderKanbanBoard';
import RecordPaymentModal from './RecordPaymentModal';
import SalesReturnModal from './SalesReturnModal';

export default function OrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');
  const [typeF, setTypeF] = useState('');
  const [q, setQ] = useState('');
  const [bill, setBill] = useState(null);
  const [pay, setPay] = useState(null);
  const [returnOrder, setReturnOrder] = useState(null);
  const [colTab, setColTab] = useState('all');
  const [acting, setActing] = useState('');

  const canManage = ['admin', 'shift_manager'].includes(user?.role);
  const canCashier = ['admin', 'shift_manager', 'cashier', 'staff'].includes(user?.role);
  const isKitchen = user?.role === 'kitchen';

  const load = useCallback(async () => {
    const p = new URLSearchParams({ limit: '100' });
    if (typeF) p.set('type', typeF);
    if (q.trim()) p.set('q', q.trim());
    try {
      setOrders((await api(`/orders?${p}`)).data);
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    }
  }, [typeF, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, [load]);

  async function move(o, status) {
    if (status === 'cancelled' && !window.confirm(`Cancel ${o.orderNumber}?`)) return;
    setActing(o.id);
    try {
      if (status === 'preparing') {
        await api(`/orders/${o.id}/confirm`, { method: 'POST' });
        toast(`${o.orderNumber} confirmed and sent to kitchen`);
      } else {
        await api(`/orders/${o.id}/status`, { method: 'PATCH', body: { status } });
        toast(`${o.orderNumber} → ${status}`);
      }
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
      await load();
    } finally {
      setActing('');
    }
  }

  async function openBill(o, reprint) {
    try {
      const { order } = await api(`/orders/${o.id}`);
      if (reprint && order.status === 'completed') {
        try {
          const inv = await api(`/invoices/by-order/${order.id}`);
          if (inv.invoice?.id) await api(`/invoices/${inv.invoice.id}/reprint`, { method: 'POST' });
        } catch {
          /* bill still printable even if invoice missing */
        }
      }
      setBill(order);
    } catch (e) {
      toast(errMsg(e), 'err');
    }
  }

  const grouped = useMemo(() => {
    const g = Object.fromEntries(ORDER_COLS.map((c) => [c.key, []]));
    (orders || []).forEach((o) => g[o.status]?.push(o));
    g.completed = g.completed.slice(0, 10);
    return g;
  }, [orders]);

  const stats = useMemo(() => {
    const all = orders || [];
    return {
      waiting: grouped.pending?.length || 0,
      ready: grouped.ready?.length || 0,
      live: all.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length,
    };
  }, [orders, grouped]);

  const visibleCols = colTab === 'all' ? ORDER_COLS : ORDER_COLS.filter((c) => c.key === colTab);

  return (
    <div>
      <OrderHeaderFilters
        q={q}
        setQ={setQ}
        typeF={typeF}
        setTypeF={setTypeF}
        colTab={colTab}
        setColTab={setColTab}
        stats={stats}
        ordersCount={orders?.length || 0}
        grouped={grouped}
        onRefresh={load}
      />

      {err && <ErrorBox message={err} onRetry={load} />}

      {!orders ? (
        <Spinner />
      ) : (
        <OrderKanbanBoard
          visibleCols={visibleCols}
          grouped={grouped}
          acting={acting}
          canCashier={canCashier}
          canManage={canManage}
          isKitchen={isKitchen}
          onMove={move}
          onOpenBill={openBill}
          onOpenPay={(o) => setPay(o)}
          onOpenReturn={(o) => setReturnOrder(o)}
        />
      )}

      {bill && <BillModal order={bill} onClose={() => setBill(null)} />}
      {pay && (
        <RecordPaymentModal
          order={pay}
          onClose={() => setPay(null)}
          onDone={() => {
            setPay(null);
            load();
          }}
        />
      )}
      {returnOrder && (
        <SalesReturnModal
          order={returnOrder}
          onClose={() => setReturnOrder(null)}
          onDone={() => {
            setReturnOrder(null);
            load();
          }}
        />
      )}
    </div>
  );
}
