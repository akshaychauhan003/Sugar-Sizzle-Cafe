'use client';
import { useState } from 'react';

export default function DiscountCouponBar({
  discType,
  setDiscType,
  discVal,
  setDiscVal,
  coupon,
  setCoupon,
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPromo = Number(discVal) > 0 || !!coupon.trim();

  return (
    <div className="promo-container">
      <button
        type="button"
        className="promo-toggle-btn"
        onClick={() => setExpanded((o) => !o)}
      >
        <div className="row">
          <span>🏷️ Discounts & Promo Codes</span>
          {hasPromo && <span className="badge st-ready">Applied</span>}
        </div>
        <span className="toggle-arrow">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="promo-expanded-panel">
          <div className="row wrap">
            <label className="grow">
              <span className="small muted">Order Discount</span>
              <div className="row" style={{ marginTop: '2px' }}>
                <select
                  value={discType}
                  onChange={(e) => setDiscType(e.target.value)}
                  style={{ width: '80px', minHeight: '38px', padding: '6px' }}
                >
                  <option value="percent">% Off</option>
                  <option value="flat">₹ Flat</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discVal}
                  onChange={(e) => setDiscVal(e.target.value)}
                  placeholder="0"
                  style={{ minHeight: '38px', padding: '6px 10px' }}
                />
              </div>
            </label>

            <label className="grow">
              <span className="small muted">Promo / Coupon Code</span>
              <div className="row" style={{ marginTop: '2px' }}>
                <input
                  value={coupon}
                  maxLength={20}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="WELCOME10 / FLAT50"
                  style={{ minHeight: '38px', padding: '6px 10px' }}
                />
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
