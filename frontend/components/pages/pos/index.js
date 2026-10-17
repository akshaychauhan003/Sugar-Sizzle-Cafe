'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, errMsg, uuid } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { ErrorBox } from '@/components/shared/ui';
import BillModal from '@/components/shared/BillModal';
import MenuFilterBar from './MenuFilterBar';
import MenuItemGrid from './MenuItemGrid';
import OrderTypeSelector from './OrderTypeSelector';
import DiscountCouponBar from './DiscountCouponBar';
import CartDrawer from './CartDrawer';
import OrderSummaryFooter from './OrderSummaryFooter';

export default function PosPage() {
  const toast = useToast();
  const [menu, setMenu] = useState(null);
  const [tables, setTables] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [cart, setCart] = useState([]);
  const [type, setType] = useState('dine-in');
  const [tableId, setTableId] = useState('');
  const [customer, setCustomer] = useState('');
  const [discType, setDiscType] = useState('percent');
  const [discVal, setDiscVal] = useState('');
  const [coupon, setCoupon] = useState('');
  const [payNow, setPayNow] = useState('cash'); // Default to cash for quick café checkout!
  const [quote, setQuote] = useState(null);
  const [quoteErr, setQuoteErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [bill, setBill] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const idem = useRef(uuid());

  const loadMenu = useCallback(async () => {
    setLoadErr('');
    try {
      const [m, t] = await Promise.all([
        api('/menu?limit=100&sort=category'),
        api('/tables'),
      ]);
      setMenu(m.data);
      setTables(t.data || []);
    } catch (e) {
      setLoadErr(errMsg(e));
    }
  }, []);

  useEffect(() => {
    loadMenu();
    // Poll tables every 5s so waitstaff cleaning updates appear live for the cashier
    const interval = setInterval(async () => {
      try {
        const t = await api('/tables');
        setTables(t.data || []);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [loadMenu]);

  const cats = useMemo(() => ['All', ...new Set((menu || []).map((m) => m.category))], [menu]);
  const shown = useMemo(
    () =>
      (menu || []).filter(
        (m) =>
          (cat === 'All' || m.category === cat) &&
          (!q || `${m.name} ${m.sku || ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [menu, cat, q],
  );

  const selectedTable = tables.find((t) => t.id === tableId);
  const payload = useMemo(
    () => ({
      type,
      ...(type === 'dine-in' && tableId ? { tableId } : {}),
      ...(type === 'dine-in' && selectedTable ? { tableNumber: selectedTable.code } : {}),
      customerName: customer.trim(),
      items: cart.map((c) => ({ menuItemId: c.id, quantity: c.quantity, notes: c.notes })),
      ...(Number(discVal) > 0 ? { discount: { type: discType, value: Number(discVal) } } : {}),
      ...(coupon.trim() ? { couponCode: coupon.trim() } : {}),
    }),
    [type, tableId, selectedTable, customer, cart, discType, discVal, coupon],
  );

  useEffect(() => {
    if (!cart.length) {
      setQuote(null);
      setQuoteErr('');
      return;
    }
    const t = setTimeout(async () => {
      try {
        const body = { ...payload, ...(type === 'dine-in' && !payload.tableNumber ? { tableNumber: 'x' } : {}) };
        setQuote((await api('/orders/quote', { method: 'POST', body })).quote);
        setQuoteErr('');
      } catch (e) {
        setQuote(null);
        setQuoteErr(errMsg(e));
      }
    }, 200);
    return () => clearTimeout(t);
  }, [payload, cart.length, type]);

  const add = (m) => {
    if (!m.isAvailable || m.stockStatus === 'out_of_stock') return;
    setCart((c) => {
      const f = c.find((x) => x.id === m.id);
      return f
        ? c.map((x) => (x.id === m.id ? { ...x, quantity: Math.min(99, x.quantity + 1) } : x))
        : [...c, { id: m.id, name: m.name, price: m.price, quantity: 1, notes: '' }];
    });
  };

  const setQty = (id, d) =>
    setCart((c) =>
      c
        .map((x) => (x.id === id ? { ...x, quantity: x.quantity + d } : x))
        .filter((x) => x.quantity > 0),
    );

  const setNote = (id, notes) =>
    setCart((c) => c.map((x) => (x.id === id ? { ...x, notes } : x)));

  const remove = (id) => setCart((c) => c.filter((x) => x.id !== id));
  const clearCart = () => setCart([]);

  async function place(sendToKitchen = false) {
    if (busy) return;
    if (!cart.length) return toast('Add at least one item to current order', 'err');
    if (type === 'dine-in') {
      if (!tableId) return toast('Please select an available table for dine-in orders', 'err');
      const chosen = tables.find((t) => t.id === tableId);
      if (!chosen || chosen.status !== 'available') {
        const msg = chosen?.status === 'cleaning'
          ? `Table ${chosen.code} has not been cleaned yet. Please wait for waitstaff or choose another table.`
          : `Table ${chosen?.code || ''} is already booked/occupied by guests. Please choose a clean, available table.`;
        return toast(msg, 'err');
      }
    }
    setBusy(true);
    try {
      const { order } = await api('/orders', {
        method: 'POST',
        body: payload,
        headers: { 'Idempotency-Key': idem.current },
      });
      let final = order;
      if (payNow !== 'none') {
        try {
          final = (
            await api(`/orders/${order.id}/payment`, {
              method: 'POST',
              body: { method: payNow, idempotencyKey: `pay-${idem.current}` },
            })
          ).order;
        } catch (e) {
          toast(`Order placed, but payment failed: ${errMsg(e)}`, 'err');
        }
      }
      if (sendToKitchen) {
        try {
          final = (
            await api(`/orders/${order.id}/confirm`, {
              method: 'POST',
            })
          ).order;
          toast(`Order #${order.orderNumber.replace('ORD-', '')} confirmed and sent to kitchen`);
        } catch (e) {
          toast(`Order placed, but kitchen dispatch failed: ${errMsg(e)}`, 'err');
        }
      } else {
        toast(`Order #${order.orderNumber.replace('ORD-', '')} placed successfully`);
      }
      setBill(final);
      setCart([]);
      setDiscVal('');
      setCoupon('');
      setCustomer('');
      setCartOpen(false);
      idem.current = uuid();
      loadMenu();
    } catch (e) {
      toast(errMsg(e), 'err');
      if (e.code === 'ITEM_UNAVAILABLE') loadMenu();
    } finally {
      setBusy(false);
    }
  }

  const count = cart.reduce((a, c) => a + c.quantity, 0);

  return (
    <div className="pos-workstation">
      {/* Left Pane: Interactive Menu Explorer */}
      <section className="pos-menu-pane">
        <MenuFilterBar q={q} setQ={setQ} cats={cats} cat={cat} setCat={setCat} />
        {loadErr && <ErrorBox message={loadErr} onRetry={loadMenu} />}
        <MenuItemGrid menu={menu} shown={shown} cart={cart} onAddItem={add} />
      </section>

      {/* Floating Cart Button for Mobile Screens */}
      <button
        type="button"
        className="pos-cart-floating-btn"
        onClick={() => setCartOpen((o) => !o)}
        aria-label="Toggle active order ticket"
      >
        <span className="cart-badge-icon">🧾 Order ({count})</span>
        <b className="cart-badge-total">{quote ? `₹${quote.total}` : ''}</b>
      </button>

      {cartOpen && <div className="pos-cart-scrim" onClick={() => setCartOpen(false)} />}

      {/* Right Pane: Persistent Touch POS Register & Bill Slip */}
      <aside className={`pos-register-pane ${cartOpen ? 'open' : ''}`}>
        {/* Zone 1: Pinned Header */}
        <div className="pos-register-header">
          <div className="row between register-header-bar">
            <div className="register-title">
              <span className="chit-icon">🧾</span>
              <div>
                <b>Current Order</b>
                <span className="item-count-text">
                  {count} {count === 1 ? 'item selected' : 'items selected'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="icon-btn pos-cart-close"
              onClick={() => setCartOpen(false)}
              aria-label="Close ticket drawer"
            >
              ✕
            </button>
          </div>

          {/* Quick 1-click Dine-In / Takeaway segmented switch */}
          <OrderTypeSelector
            mode="switch-only"
            type={type}
            setType={setType}
            tables={tables}
            tableId={tableId}
            setTableId={setTableId}
            customer={customer}
            setCustomer={setCustomer}
          />
        </div>

        {/* Zone 2: Scrollable Middle Container (Tables, Guest, Promo, Cart Items) */}
        <div className="pos-register-scroll-area">
          <OrderTypeSelector
            mode="details-only"
            type={type}
            setType={setType}
            tables={tables}
            tableId={tableId}
            setTableId={setTableId}
            customer={customer}
            setCustomer={setCustomer}
          />

          <DiscountCouponBar
            discType={discType}
            setDiscType={setDiscType}
            discVal={discVal}
            setDiscVal={setDiscVal}
            coupon={coupon}
            setCoupon={setCoupon}
          />

          <CartDrawer
            cart={cart}
            onSetQty={setQty}
            onSetNote={setNote}
            onRemove={remove}
            onClear={clearCart}
          />
        </div>

        {/* Zone 3: Pinned Bottom Footer with Totals & Action Buttons */}
        <OrderSummaryFooter
          cart={cart}
          quote={quote}
          quoteErr={quoteErr}
          payNow={payNow}
          setPayNow={setPayNow}
          busy={busy}
          onPlaceOrder={place}
        />
      </aside>

      {bill && <BillModal order={bill} onClose={() => setBill(null)} />}
    </div>
  );
}
