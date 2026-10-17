'use client';
import { useState } from 'react';
import { api, errMsg, money, uuid } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { Modal } from '@/components/shared/ui';

export default function RecordPaymentModal({ order, onClose, onDone }) {
  const toast = useToast();
  const [method, setMethod] = useState('cash');
  const [amount, setAmount] = useState(String(order.balanceDue));
  const [cashTendered, setCashTendered] = useState(String(order.balanceDue));
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [key] = useState(uuid());

  const changeDue = method === 'cash' && Number(cashTendered) >= Number(amount)
    ? Math.max(0, Number(cashTendered) - Number(amount))
    : 0;

  async function submit(e) {
    e.preventDefault();
    const a = Number(amount);
    if (!(a > 0) || a > order.balanceDue) {
      return toast(`Amount must be between 0.01 and ${order.balanceDue}`, 'err');
    }
    setBusy(true);
    try {
      const referenceNotes = method === 'cash' && Number(cashTendered) > a
        ? `${ref ? `${ref} • ` : ''}Tendered: ${money(cashTendered)}, Change: ${money(changeDue)}`
        : ref;

      await api(`/orders/${order.id}/payment`, {
        method: 'POST',
        body: { method, amount: a, reference: referenceNotes, idempotencyKey: key },
      });
      toast(`Payment of ${money(a)} recorded via ${method.toUpperCase()}`);
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
        <p className="muted" style={{ margin: '0 0 6px' }}>
          Balance due: <b style={{ color: 'var(--ink)' }}>{money(order.balanceDue)}</b>.
        </p>

        <label>
          Payment Method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash (Calculates change due)</option>
            <option value="upi">UPI / QR</option>
            <option value="card">Credit / Debit Card</option>
          </select>
        </label>

        <label>
          Amount to Pay
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (Number(cashTendered) < Number(e.target.value)) setCashTendered(e.target.value);
            }}
          />
        </label>

        {method === 'cash' && (
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ margin: 0, fontWeight: 600 }}>
              Amount Received from Customer
              <input
                type="number"
                step="0.01"
                min={amount}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="Enter cash received"
                style={{ marginTop: '4px' }}
              />
            </label>

            <div className="row wrap" style={{ gap: '6px', marginTop: '8px' }}>
              <span className="muted small" style={{ alignSelf: 'center' }}>Quick Tender:</span>
              <button type="button" className="btn sm" onClick={() => setCashTendered(amount)}>
                Exact ({money(amount)})
              </button>
              {[100, 200, 500, 1000, 2000].filter((val) => val >= Number(amount)).slice(0, 3).map((val) => (
                <button key={val} type="button" className="btn sm" onClick={() => setCashTendered(String(val))}>
                  ₹{val}
                </button>
              ))}
            </div>

            {changeDue > 0 && (
              <div style={{ marginTop: '10px', padding: '8px 10px', background: '#ecfdf5', borderRadius: '6px', color: '#065f46', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>Change Due to Return:</span>
                <span style={{ fontSize: '1.05rem', color: '#047857' }}>{money(changeDue)}</span>
              </div>
            )}
          </div>
        )}
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
