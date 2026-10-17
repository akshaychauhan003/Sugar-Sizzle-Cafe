'use client';
import { useState } from 'react';
import { api, errMsg, money, uuid } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { Modal } from '@/components/shared/ui';

export default function RecordPaymentModal({ order, onClose, onDone }) {
  const toast = useToast();
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState(String(order.balanceDue));
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [key] = useState(uuid());

  async function submit(e) {
    e.preventDefault();
    const a = Number(amount);
    if (!(a > 0) || a > order.balanceDue) {
      return toast(`Amount must be between 0.01 and ${order.balanceDue}`, 'err');
    }
    setBusy(true);
    try {
      await api(`/orders/${order.id}/payment`, {
        method: 'POST',
        body: { method, amount: a, reference: ref, idempotencyKey: key },
      });
      toast('Payment recorded');
      onDone();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Record payment • ${order.orderNumber}`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <p className="muted">
          Balance due: <b>{money(order.balanceDue)}</b>. This records a payment only; no gateway is charged.
        </p>
        <label>
          Method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>
        </label>
        <label>
          Amount
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Reference (optional)
          <input
            value={ref}
            maxLength={100}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. UPI Ref / Receipt #"
          />
        </label>
        <div className="row end">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
