'use client';
import { useState } from 'react';
import { download, errMsg } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { Modal } from '@/components/shared/ui';
import PasswordInput from '@/components/shared/PasswordInput';

export default function ExportCsvModal({
  startDate,
  endDate,
  date,
  onClose,
}) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleExport(e) {
    e.preventDefault();
    setBusy(true);

    const p = new URLSearchParams();
    if (startDate && endDate) {
      p.set('startDate', startDate);
      p.set('endDate', endDate);
    } else if (date) {
      p.set('date', date);
    }

    if (requirePassword && password) {
      p.set('password', password);
    }

    const filename = startDate && endDate
      ? `sales-report-${startDate}_to_${endDate}.csv`
      : `sales-report-${date || 'today'}.csv`;

    try {
      await download(`/reports/export.csv?${p.toString()}`, filename);
      toast('Sales report downloaded successfully');
      onClose();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Export Sales Report (CSV)" onClose={onClose}>
      <form onSubmit={handleExport} className="stack">
        <p className="muted small">
          Download comprehensive sales data, order numbers, line items, taxes, payment methods, and net collections in CSV spreadsheet format.
        </p>

        <div className="card" style={{ padding: '10px 14px' }}>
          <div className="small muted">Report Date Range:</div>
          <b>{startDate && endDate ? `${startDate} to ${endDate}` : date || 'Today'}</b>
        </div>

        <label className="row" style={{ gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={requirePassword}
            onChange={(e) => setRequirePassword(e.target.checked)}
          />
          <span>Verify Manager Password before export</span>
        </label>

        {requirePassword && (
          <PasswordInput
            id="exportManagerPassword"
            label="Manager Password"
            placeholder="Enter your account password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        )}

        <div className="row end" style={{ marginTop: '10px' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy || (requirePassword && !password)}>
            {busy ? 'Preparing CSV…' : 'Download CSV Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
