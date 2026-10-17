'use client';
import { money } from '@/lib/api';
import { Modal } from './ui';

export default function BillModal({ order, onClose }) {
  const o = order;
  if (!o) return null;

  const cashierName = o.createdBy?.name || (typeof o.createdBy === 'string' ? 'Staff' : 'Cashier Desk');

  function downloadReceipt() {
    const el = document.getElementById('printable-receipt-area');
    if (!el) return;
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${o.orderNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; max-width: 400px; margin: auto; color: #1e293b; }
            .receipt { border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; }
            h2 { text-align: center; margin: 0; font-size: 1.25rem; }
            .center { text-align: center; font-size: 0.85rem; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 0.9rem; }
            th, td { padding: 6px 0; text-align: left; }
            .r { text-align: right; }
            .sep { border-top: 1px dashed #cbd5e1; }
            .tot { font-weight: bold; font-size: 1.05rem; border-top: 1px solid #000; border-bottom: 1px solid #000; }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${el.innerHTML}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${o.orderNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal title={`Tax Invoice • ${o.orderNumber}`} onClose={onClose}>
      <div id="printable-receipt-area" className="print-area receipt" style={{ maxWidth: '420px', margin: '0 auto', padding: '16px 12px' }}>
        <h2 style={{ textAlign: 'center', margin: 0, letterSpacing: '0.04em', fontSize: '1.25rem' }}>RESTOFLOW CAFÉ</h2>
        <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--espresso)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
          Artisan Bakery &amp; Specialty Kitchen
        </div>
        <p className="muted small" style={{ textAlign: 'center', margin: '4px 0 2px', lineHeight: 1.4 }}>
          42 Gourmet Boulevard, Central City • Tel: +91 98765 43210<br />
          GSTIN: 27AABCS1429B1Z • FSSAI Lic: 1152101800042
        </p>
        <div style={{ borderBottom: '1px dashed #cbd5e1', margin: '8px 0' }} />

        <div style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
          <div className="row between">
            <span><b>Order:</b> {o.orderNumber}</span>
            <span>{new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="row between">
            <span><b>Type:</b> {o.type === 'dine-in' ? `Dine-In • Table ${o.tableNumber || 'N/A'}` : 'Takeaway (To-Go)'}</span>
            <span><b>Billed By:</b> {cashierName}</span>
          </div>
          {o.customerName && (
            <div><b>Customer:</b> {o.customerName}</div>
          )}
        </div>

        <table className="rt" style={{ width: '100%', marginTop: '10px', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', textTransform: 'uppercase', color: '#64748b' }}>
              <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
              <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Qty</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Price</th>
              <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i._id || i.id} style={{ borderBottom: '1px dotted #f1f5f9' }}>
                <td style={{ padding: '6px 0' }}>
                  <div style={{ fontWeight: 500 }}>{i.name}</div>
                  {i.notes && <div className="muted small" style={{ fontSize: '0.74rem' }}>Note: {i.notes}</div>}
                </td>
                <td style={{ textAlign: 'center', padding: '6px 0' }}>{i.quantity}</td>
                <td style={{ textAlign: 'right', padding: '6px 0' }}>{money(i.unitPrice)}</td>
                <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>{money(i.lineTotal)}</td>
              </tr>
            ))}
            <tr className="sep" style={{ borderTop: '1px dashed #cbd5e1' }}>
              <td colSpan={3} style={{ paddingTop: '8px' }}>Subtotal</td>
              <td className="r" style={{ paddingTop: '8px' }}>{money(o.subtotal)}</td>
            </tr>
            {o.discountAmount > 0 && (
              <tr style={{ color: '#047857' }}>
                <td colSpan={3}>Discount Applied</td>
                <td className="r">−{money(o.discountAmount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3}>CGST &amp; SGST / Tax ({o.taxRate}%)</td>
              <td className="r">{money(o.taxAmount)}</td>
            </tr>
            <tr className="tot" style={{ fontSize: '1.05rem', fontWeight: 700, borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
              <td colSpan={3} style={{ padding: '8px 0' }}>Total Amount Due</td>
              <td className="r" style={{ padding: '8px 0' }}>{money(o.total)}</td>
            </tr>

            {/* Recorded Payments */}
            {(o.payments || []).map((p) => (
              <tr key={p._id || p.id} style={{ fontSize: '0.82rem', color: '#334155' }}>
                <td colSpan={3} style={{ paddingTop: '4px' }}>
                  Paid via <b>{p.method?.toUpperCase()}</b>
                  {p.reference ? <span className="muted" style={{ fontSize: '0.75rem', display: 'block' }}>Ref: {p.reference}</span> : null}
                </td>
                <td className="r" style={{ paddingTop: '4px', fontWeight: 600 }}>{money(p.amount)}</td>
              </tr>
            ))}

            {o.balanceDue > 0 ? (
              <tr style={{ color: '#b91c1c', fontWeight: 600 }}>
                <td colSpan={3} style={{ paddingTop: '4px' }}>Balance Due</td>
                <td className="r" style={{ paddingTop: '4px' }}>{money(o.balanceDue)}</td>
              </tr>
            ) : (
              <tr style={{ color: '#047857', fontWeight: 600, fontSize: '0.82rem' }}>
                <td colSpan={3} style={{ paddingTop: '4px' }}>Payment Status</td>
                <td className="r" style={{ paddingTop: '4px' }}>FULLY PAID</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Digital Verification QR Code Stamp */}
        <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
          <div style={{ display: 'inline-block', padding: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <svg width="84" height="84" viewBox="0 0 100 100" style={{ display: 'block' }}>
              <rect width="100" height="100" fill="#fff" />
              {/* Outer Position Boxes */}
              <rect x="10" y="10" width="28" height="28" fill="#1e293b" />
              <rect x="14" y="14" width="20" height="20" fill="#fff" />
              <rect x="18" y="18" width="12" height="12" fill="#1e293b" />

              <rect x="62" y="10" width="28" height="28" fill="#1e293b" />
              <rect x="66" y="14" width="20" height="20" fill="#fff" />
              <rect x="70" y="18" width="12" height="12" fill="#1e293b" />

              <rect x="10" y="62" width="28" height="28" fill="#1e293b" />
              <rect x="14" y="66" width="20" height="20" fill="#fff" />
              <rect x="18" y="70" width="12" height="12" fill="#1e293b" />

              {/* Data Dots Pattern */}
              <rect x="44" y="14" width="8" height="8" fill="#1e293b" />
              <rect x="44" y="28" width="8" height="8" fill="#1e293b" />
              <rect x="22" y="44" width="8" height="8" fill="#1e293b" />
              <rect x="36" y="44" width="8" height="8" fill="#1e293b" />
              <rect x="50" y="44" width="8" height="8" fill="#1e293b" />
              <rect x="64" y="44" width="8" height="8" fill="#1e293b" />
              <rect x="78" y="44" width="8" height="8" fill="#1e293b" />
              <rect x="44" y="58" width="8" height="8" fill="#1e293b" />
              <rect x="58" y="58" width="8" height="8" fill="#1e293b" />
              <rect x="72" y="58" width="8" height="8" fill="#1e293b" />
              <rect x="50" y="72" width="8" height="8" fill="#1e293b" />
              <rect x="68" y="72" width="8" height="8" fill="#1e293b" />
              <rect x="56" y="82" width="8" height="8" fill="#1e293b" />
              <rect x="78" y="82" width="8" height="8" fill="#1e293b" />
            </svg>
          </div>
          <div className="muted small" style={{ fontSize: '0.72rem', marginTop: '4px' }}>
            Scan to view digital receipt &amp; invoice record
          </div>
        </div>

        <p className="muted small" style={{ textAlign: 'center', fontWeight: 500, marginTop: '12px', fontSize: '0.78rem' }}>
          Thank you for choosing RestoFlow! Visit again.
        </p>
      </div>

      <div className="row end" style={{ gap: '8px', marginTop: '16px' }}>
        <button type="button" className="btn" onClick={onClose}>Close</button>
        <button type="button" className="btn" onClick={downloadReceipt}>Download HTML</button>
        <button type="button" className="btn primary" onClick={() => window.print()}>Print Receipt</button>
      </div>
    </Modal>
  );
}
