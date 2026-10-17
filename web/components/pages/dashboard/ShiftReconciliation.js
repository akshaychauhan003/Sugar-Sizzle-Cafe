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
    <div className="card stack">
      <h3>Active Shift & Till Reconciliation</h3>
      {!shift ? (
        <div className="row wrap">
          <label>
            Opening Cash Float
            <input
              type="number"
              min="0"
              step="0.01"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </label>
          <button className="btn primary" disabled={busy} onClick={onStartShift}>
            Start Shift
          </button>
        </div>
      ) : (
        <>
          <p className="muted small">
            {shift.shiftNumber} • {shift.status} • Opening {money(shift.openingCash)} • Expected Float {money(shift.expectedCash)}
            {shift.actualCash != null
              ? ` • Actual ${money(shift.actualCash)} • Variance ${money(shift.cashVariance)}`
              : ''}
          </p>
          <div className="row between wrap">
            <span>Cash / UPI / Card Float</span>
            <b>
              {money(shift.totals?.cash)} / {money(shift.totals?.upi)} / {money(shift.totals?.card)}
            </b>
          </div>
          {shift.status !== 'locked' && (
            <div className="row wrap">
              <select value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                <option value="in">Cash Float In (+)</option>
                <option value="out">Cash Float Out (-)</option>
              </select>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={moveAmt}
                onChange={(e) => setMoveAmt(e.target.value)}
              />
              <button className="btn sm" disabled={busy} onClick={onCashMove}>
                Record
              </button>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Actual Cash Count"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
              />
              <button className="btn sm" disabled={busy} onClick={onReconcile}>
                Reconcile
              </button>
              {canManage && (
                <button className="btn sm danger" disabled={busy} onClick={onLockShift}>
                  Lock Shift
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
