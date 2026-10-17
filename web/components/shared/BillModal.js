'use client';
import { money } from '@/lib/api';
import { Modal } from './ui';

export default function BillModal({ order, onClose }) {
  const o = order;
  if (!o) return null;

  return (
    <Modal title={`Bill ${o.orderNumber}`} onClose={onClose}>
      <div className="print-area receipt">
        <h2 style={{ textAlign: 'center', margin: 0, letterSpacing: '0.04em' }}>SUGAR &amp; SIZZLE CAFÉ</h2>
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--espresso)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Artisan Café &amp; Kitchen
        </div>
        <p className="muted" style={{ textAlign: 'center', margin: '4px 0 12px' }}>
          {o.orderNumber} • {new Date(o.createdAt).toLocaleString()}
        </p>
        <p>
          {o.type === 'dine-in' ? `Dine-in, table ${o.tableNumber}` : 'Takeaway'}
          {o.customerName ? ` • ${o.customerName}` : ''}
        </p>
        <table className="rt">
          <tbody>
            {o.items.map((i) => (
              <tr key={i._id || i.id}>
                <td>
                  {i.quantity} × {i.name}
                  {i.notes ? <div className="muted small">{i.notes}</div> : null}
                </td>
                <td className="r">{money(i.lineTotal)}</td>
              </tr>
            ))}
            <tr className="sep">
              <td>Subtotal</td>
              <td className="r">{money(o.subtotal)}</td>
            </tr>
            {o.discountAmount > 0 && (
              <tr>
                <td>Discount</td>
                <td className="r">-{money(o.discountAmount)}</td>
              </tr>
            )}
            <tr>
              <td>Tax ({o.taxRate}%)</td>
              <td className="r">{money(o.taxAmount)}</td>
            </tr>
            <tr className="tot">
              <td>Total</td>
              <td className="r">{money(o.total)}</td>
            </tr>
            {(o.payments || []).map((p) => (
              <tr key={p._id || p.id}>
                <td className="muted">Paid via {p.method.toUpperCase()}</td>
                <td className="r">{money(p.amount)}</td>
              </tr>
            ))}
            {o.balanceDue > 0 && (
              <tr>
                <td>Balance due</td>
                <td className="r">{money(o.balanceDue)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="muted small" style={{ textAlign: 'center', fontWeight: 500, marginTop: '14px' }}>
          Thank you for dining with us! Please visit again.
        </p>
      </div>
      <div className="row end">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn primary" onClick={() => window.print()}>Print</button>
      </div>
    </Modal>
  );
}
