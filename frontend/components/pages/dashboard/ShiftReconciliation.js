'use client';
import { money } from '@/lib/api';

export default function ShiftReconciliation({
  shift,
  opening,
  setOpening,
  moveType,
  setMoveType,
  moveAmt,
  setMoveAmt,
  actualCash,
  setActualCash,
  busy,
  canManage,
  onStartShift,
  onCashMove,
  onReconcile,
  onLockShift,
}) {
  return (
    <div className="card shift-reconcile-card">
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Active Shift &amp; Till Reconciliation</h3>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Cash drawer float tracking, drawer in/out movements, and end-of-day reconciliation
          </p>
        </div>
        {shift && (
          <span className={`badge ${shift.status === 'locked' ? 'st-completed' : 'st-ready'}`}>
            {shift.status === 'locked' ? '🔒 Shift Locked' : '🟢 Shift Active'}
          </span>
        )}
      </div>

      {!shift ? (
        <div className="shift-start-box">
          <div className="row wrap" style={{ alignItems: 'flex-end', gap: '12px' }}>
            <label style={{ flex: '1', minWidth: '220px' }}>
              <span>Opening Cash Float (₹)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={opening}
                placeholder="2000"
                onChange={(e) => setOpening(e.target.value)}
              />
            </label>
            <button className="btn primary" disabled={busy} onClick={onStartShift}>
              {busy ? 'Starting…' : 'Start New Shift'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Shift KPI Highlights */}
          <div className="shift-summary-grid">
            <div className="shift-mini-kpi">
              <span className="mini-label">Shift #</span>
              <b>{shift.shiftNumber}</b>
            </div>
            <div className="shift-mini-kpi">
              <span className="mini-label">Opening Float</span>
              <b>{money(shift.openingCash)}</b>
            </div>
            <div className="shift-mini-kpi">
              <span className="mini-label">Expected Drawer</span>
              <b style={{ color: 'var(--coffee-dark)' }}>{money(shift.expectedCash)}</b>
            </div>
            <div className="shift-mini-kpi">
              <span className="mini-label">Actual Count</span>
              <b>{shift.actualCash != null ? money(shift.actualCash) : '—'}</b>
            </div>
            <div className="shift-mini-kpi">
              <span className="mini-label">Variance</span>
              <b style={{ color: shift.cashVariance < 0 ? 'var(--berry-red)' : 'var(--matcha-green)' }}>
                {shift.cashVariance != null ? money(shift.cashVariance) : '—'}
              </b>
            </div>
          </div>

          <div className="shift-payment-mix-bar">
            <span className="mix-title">Collections by Channel:</span>
            <span className="mix-pill">💵 Cash: <b>{money(shift.totals?.cash || 0)}</b></span>
            <span className="mix-pill">📱 UPI: <b>{money(shift.totals?.upi || 0)}</b></span>
            <span className="mix-pill">💳 Card: <b>{money(shift.totals?.card || 0)}</b></span>
          </div>

          {shift.status !== 'locked' && (
            <div className="shift-actions-grid">
              {/* Box 1: Cash Movement (Float In / Out) */}
              <div className="shift-action-box">
                <h4>💵 Cash Movement</h4>
                <div className="shift-action-form">
                  <select
                    value={moveType}
                    onChange={(e) => setMoveType(e.target.value)}
                    aria-label="Movement type"
                  >
                    <option value="in">Cash In (+) Float Addition</option>
                    <option value="out">Cash Out (−) Petty Expense</option>
                  </select>
                  <div className="row" style={{ gap: '8px' }}>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Amount (₹)"
                      value={moveAmt}
                      onChange={(e) => setMoveAmt(e.target.value)}
                    />
                    <button className="btn sm primary" disabled={busy || !(Number(moveAmt) > 0)} onClick={onCashMove}>
                      Record
                    </button>
                  </div>
                </div>
              </div>

              {/* Box 2: End-of-Shift Reconciliation */}
              <div className="shift-action-box">
                <h4>⚖️ Reconcile &amp; Lock</h4>
                <div className="shift-action-form">
                  <div className="row" style={{ gap: '8px' }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Actual cash counted (₹)"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                    />
                    <button className="btn sm" disabled={busy || actualCash === ''} onClick={onReconcile}>
                      Calculate
                    </button>
                  </div>
                  {canManage && (
                    <button
                      className="btn sm danger"
                      style={{ marginTop: '4px' }}
                      disabled={busy}
                      onClick={onLockShift}
                    >
                      🔒 Lock &amp; Finalize Shift
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
