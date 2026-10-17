'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useAuth, useToast } from '@/components/shared/AuthProvider';
import { ErrorBox, Spinner } from '@/components/shared/ui';
import BillModal from '@/components/shared/BillModal';
import OrderHeaderFilters, { ORDER_COLS, STAFF_ORDER_COLS } from './OrderHeaderFilters';
import OrderKanbanBoard from './OrderKanbanBoard';
import RecordPaymentModal from './RecordPaymentModal';
import SalesReturnModal from './SalesReturnModal';
import TableTurnoverStation from './TableTurnoverStation';

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
  const [acting, setActing] = useState('');
  const [tableStats, setTableStats] = useState({ cleaning: 0, occupied: 0, available: 0 });

  const isStaff = user?.role === 'staff';
  const canManage = ['admin', 'shift_manager'].includes(user?.role);
  const canCashier = ['admin', 'shift_manager', 'cashier'].includes(user?.role);
  const isKitchen = user?.role === 'kitchen';

  const [colTab, setColTab] = useState(isStaff ? 'ready' : 'all');

  useEffect(() => {
    if (isStaff && !['all', 'ready', 'preparing', 'turnover'].includes(colTab)) {
      setColTab('ready');
    }
  }, [isStaff, colTab]);

  const loadTablesStats = useCallback(async () => {
    try {
      const res = await api('/tables');
      const list = res.data || [];
      setTableStats({
        cleaning: list.filter((t) => t.status === 'cleaning').length,
        occupied: list.filter((t) => t.status === 'occupied').length,
        available: list.filter((t) => t.status === 'available').length,
      });
    } catch {}
  }, []);

  useEffect(() => {
    loadTablesStats();
    const interval = setInterval(loadTablesStats, 6000);
    return () => clearInterval(interval);
  }, [loadTablesStats]);

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

  async function acceptDelivery(o) {
    setActing(o.id);
    try {
      await api(`/orders/${o.id}/accept-delivery`, { method: 'POST' });
      toast(`Accepted ${o.orderNumber} for delivery!`);
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  async function deliverOrder(o) {
    setActing(o.id);
    try {
      await api(`/orders/${o.id}/deliver`, { method: 'POST' });
      toast(`${o.orderNumber} marked as delivered to table!`);
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  async function openBill(o, reprint) {
    if (isStaff) return;
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

  // Filter out pending, delivered, completed orders for waitstaff
  const displayOrders = useMemo(() => {
    if (!orders) return null;
    if (!isStaff) return orders;
    return orders.filter((o) => ['ready', 'preparing'].includes(o.status));
  }, [orders, isStaff]);

  const grouped = useMemo(() => {
    const cols = isStaff ? STAFF_ORDER_COLS : ORDER_COLS;
    const g = Object.fromEntries(cols.map((c) => [c.key, []]));
    (displayOrders || []).forEach((o) => {
      if (g[o.status]) g[o.status].push(o);
    });
    if (g.completed) {
      g.completed = (g.completed || []).slice(0, 10);
    }
    return g;
  }, [displayOrders, isStaff]);

  const stats = useMemo(() => {
    const all = displayOrders || [];
    return {
      waiting: grouped.pending?.length || 0,
      ready: grouped.ready?.length || 0,
      delivered: grouped.delivered?.length || 0,
      preparing: grouped.preparing?.length || 0,
      live: isStaff
        ? (grouped.ready?.length || 0) + (grouped.preparing?.length || 0)
        : all.filter((o) => ['pending', 'preparing', 'ready', 'delivered'].includes(o.status)).length,
    };
  }, [displayOrders, grouped, isStaff]);

  const currentCols = isStaff ? STAFF_ORDER_COLS : ORDER_COLS;
  const visibleCols = colTab === 'all' ? currentCols : currentCols.filter((c) => c.key === colTab);

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
        ordersCount={isStaff ? ((grouped.ready?.length || 0) + (grouped.preparing?.length || 0)) : (orders?.length || 0)}
        grouped={grouped}
        onRefresh={load}
        isStaff={isStaff}
        tableStats={tableStats}
      />

      {err && <ErrorBox message={err} onRetry={load} />}

      {colTab === 'turnover' ? (
        <TableTurnoverStation isStaff={isStaff} />
      ) : !displayOrders ? (
        <Spinner />
      ) : (
        <OrderKanbanBoard
          visibleCols={visibleCols}
          grouped={grouped}
          isStaff={isStaff}
          acting={acting}
          canCashier={canCashier}
          canManage={canManage}
          isKitchen={isKitchen}
          onMove={move}
          onOpenBill={openBill}
          onOpenPay={(o) => !isStaff && setPay(o)}
          onOpenReturn={(o) => !isStaff && setReturnOrder(o)}
          onAcceptDelivery={acceptDelivery}
          onDeliver={deliverOrder}
        />
      )}

      {bill && !isStaff && <BillModal order={bill} onClose={() => setBill(null)} />}
      {pay && !isStaff && (
        <RecordPaymentModal
          order={pay}
          onClose={() => setPay(null)}
          onDone={() => {
            setPay(null);
            load();
          }}
        />
      )}
      {returnOrder && !isStaff && (
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
