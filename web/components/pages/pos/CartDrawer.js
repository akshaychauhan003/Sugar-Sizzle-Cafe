'use client';
import { money } from '@/lib/api';

export default function CartDrawer({
  cart = [],
  onSetQty,
  onSetNote,
  onRemove,
  onClear,
}) {
  if (cart.length === 0) {
    return (
      <div className="cart-empty-state">
        <div className="empty-cart-icon">🛒</div>
        <div className="empty-cart-title">Order is Empty</div>
        <p className="empty-cart-desc">
          Select items from the menu on the left to add them to this order.
        </p>
      </div>
    );
  }

  return (
    <div className="cart-ticket-list">
      {cart.map((c, index) => (
        <div key={c.id} className="ticket-item-row">
          <div className="ticket-item-top">
            <div className="ticket-item-info">
              <span className="ticket-num">{index + 1}.</span>
              <span className="ticket-name">{c.name}</span>
            </div>
            <span className="ticket-price">{money(c.price * c.quantity)}</span>
          </div>

          <div className="ticket-item-controls">
            <div className="ticket-stepper">
              <button
                type="button"
                className="step-btn minus"
                onClick={() => onSetQty(c.id, -1)}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="step-qty">{c.quantity}</span>
              <button
                type="button"
                className="step-btn plus"
                onClick={() => onSetQty(c.id, 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <span className="unit-price-hint">@{money(c.price)}</span>

            <button
              type="button"
              className="ticket-del-btn"
              onClick={() => onRemove(c.id)}
              aria-label={`Remove ${c.name}`}
              title="Remove item"
            >
              ✕
            </button>
          </div>

          <div className="ticket-item-notes">
            <input
              className="ticket-note-input"
              placeholder="Special instructions (e.g. less ice, oat milk)…"
              value={c.notes}
              maxLength={140}
              onChange={(e) => onSetNote(c.id, e.target.value)}
            />
          </div>
        </div>
      ))}

      <div className="cart-clear-bar">
        <button
          type="button"
          className="clear-ticket-btn"
          onClick={onClear}
        >
          Clear Order
        </button>
      </div>
    </div>
  );
}
