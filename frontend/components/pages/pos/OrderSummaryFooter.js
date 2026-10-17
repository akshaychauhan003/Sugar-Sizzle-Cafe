'use client';
import { money } from '@/lib/api';

const PAYMENT_METHODS = [
  { key: 'none', label: 'Pay Later', icon: '' },
  { key: 'cash', label: 'Cash', icon: '' },
  { key: 'upi', label: 'UPI / QR', icon: '' },
  { key: 'card', label: 'Card', icon: '' },
];

export default function OrderSummaryFooter({
  cart = [],
  quote,
  quoteErr,
  payNow,
  setPayNow,
  busy,
  onPlaceOrder,
}) {
  if (cart.length === 0) return null;

  return (
    <div className="pos-register-footer">
      {quoteErr && <div className="quote-error-banner">{quoteErr}</div>}

      {/* Bill Computation Box */}
      {quote && (
        <div className="register-receipt-box">
          <div className="receipt-line">
            <span className="receipt-label">Items Subtotal</span>
            <span className="receipt-val">{money(quote.subtotal)}</span>
          </div>

          {quote.discountAmount > 0 && (
            <div className="receipt-line discount">
              <span className="receipt-label">Discount Applied</span>
              <span className="receipt-val">−{money(quote.discountAmount)}</span>
            </div>
          )}

          <div className="receipt-line">
            <span className="receipt-label">GST / Tax ({quote.taxRate}%)</span>
            <span className="receipt-val">{money(quote.taxAmount)}</span>
          </div>

          <div className="receipt-line total-due">
            <div className="total-title">
              <b>Grand Total</b>
              <small className="muted">Server calculated</small>
            </div>
            <div className="total-amount">{money(quote.total)}</div>
          </div>
        </div>
      )}

      {/* Payment Method Quick Selector */}
      <div className="payment-method-selector">
        <div className="row between payment-method-header">
          <span className="small-heading">Payment Method</span>
          <span className="muted small">Select method</span>
        </div>

        <div className="payment-pills-row">
          {PAYMENT_METHODS.map((m) => {
            const isSelected = payNow === m.key;
            return (
              <button
                key={m.key}
                type="button"
                className={`pay-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => setPayNow(m.key)}
              >
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick POS Action Buttons */}
      <div className="pos-action-buttons">
        <button
          type="button"
          className="btn-pos-primary"
          disabled={busy || !quote}
          onClick={() => onPlaceOrder(false)}
        >
          {busy ? (
            <span className="btn-pos-label">Processing…</span>
          ) : payNow !== 'none' ? (
            <span className="btn-pos-label">Pay & Complete {money(quote?.total || 0)}</span>
          ) : (
            <span className="btn-pos-label">Save Order (Unpaid)</span>
          )}
        </button>

        <button
          type="button"
          className="btn-pos-kitchen"
          disabled={busy || !quote}
          onClick={() => onPlaceOrder(true)}
          title="Place order and send tickets to kitchen"
        >
          <span className="btn-pos-label">Send to Kitchen</span>
        </button>
      </div>
    </div>
  );
}

