'use client';
import { useState } from 'react';
import { api, errMsg, money } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { Modal } from '@/components/shared/ui';

export default function SalesReturnModal({ order, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('Customer returned item');
  const [restock, setRestock] = useState(true);
  const [refundMethod, setRefundMethod] = useState(
    order.payments?.[0]?.method || 'cash',
  );
  const [busy, setBusy] = useState(false);
  const [returnQty, setReturnQty] = useState(
    Object.fromEntries(order.items.map((i) => [i.id || i._id, i.quantity])),
  );

  const calculateRefund = () => {
    let sum = 0;
    for (const item of order.items) {
      const q = returnQty[item.id || item._id] || 0;
      if (q > 0) {
        sum += (item.unitPrice || (item.lineTotal / item.quantity)) * q;
      }
    }
    return Math.min(sum, order.total);
  };

  const refundTotal = calculateRefund();

  async function submit(e) {
    e.preventDefault();
    const itemsToReturn = order.items
      .map((item) => ({
        itemId: item.id || item._id,
        quantity: returnQty[item.id || item._id] || 0,
      }))
      .filter((i) => i.quantity > 0);

    if (itemsToReturn.length === 0) {
      return toast('Please select at least 1 item to return', 'err');
    }

    setBusy(true);
    try {
      await api(`/orders/${order.id}/return`, {
        method: 'POST',
        body: {
          reason,
          restock,
          paymentMethod: refundMethod,
          items: itemsToReturn,
          refundAmount: refundTotal,
        },
      });
      toast(`Return processed for #${order.orderNumber.replace('ORD-', '')}${restock ? ' (Stock restored)' : ''}`);
      onDone();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Sales Return • ${order.orderNumber}`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <p className="muted small">
          Process return for completed order. Returned items will be restored to inventory stock if restock is enabled.
        </p>

        <label>
          Return Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="Customer returned item">Customer returned item</option>
            <option value="Wrong item prepared">Wrong item prepared</option>
            <option value="Quality / temperature issue">Quality / temperature issue</option>
            <option value="Customer cancelled after billing">Customer cancelled after billing</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <div>
          <b className="small" style={{ display: 'block', marginBottom: '6px' }}>Select Items to Return:</b>
          <div className="stack" style={{ gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {order.items.map((i) => {
              const id = i.id || i._id;
              const max = i.quantity;
              const cur = returnQty[id] || 0;

              return (
                <div key={id} className="row between card" style={{ padding: '8px 12px' }}>
                  <div>
                    <b>{i.name}</b>
                    <div className="muted small">Ordered: {max} × {money(i.unitPrice || (i.lineTotal / i.quantity))}</div>
                  </div>
                  <div className="row" style={{ gap: '6px' }}>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={cur <= 0}
                      onClick={() => setReturnQty((q) => ({ ...q, [id]: Math.max(0, cur - 1) }))}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>{cur}</span>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={cur >= max}
                      onClick={() => setReturnQty((q) => ({ ...q, [id]: Math.min(max, cur + 1) }))}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <label className="row" style={{ gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={restock}
            onChange={(e) => setRestock(e.target.checked)}
          />
          <span>Restore inventory stock for returned items</span>
        </label>

        <div className="row between">
          <label className="grow">
            Refund Method
            <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </label>

          <div style={{ textAlign: 'right' }}>
            <span className="muted small">Estimated Refund</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--chili)' }}>
              {money(refundTotal)}
            </div>
          </div>
        </div>

        <div className="row end" style={{ marginTop: '8px' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn danger" disabled={busy || refundTotal <= 0}>
            {busy ? 'Processing…' : `Confirm Return & Refund (${money(refundTotal)})`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
