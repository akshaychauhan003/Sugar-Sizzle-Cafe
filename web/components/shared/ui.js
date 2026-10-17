'use client';
import { useEffect } from 'react';

const STATUS_LABEL = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const StatusBadge = ({ status }) => (
  <span className={`badge st-${status}`}>{STATUS_LABEL[status] || status}</span>
);

export const PayBadge = ({ status }) => (
  <span className={`badge pay-${status}`}>{status}</span>
);

export const TypeBadge = ({ type, table }) => (
  <span className="badge type">
    {type === 'dine-in' ? `Dine-in${table ? ` • ${table}` : ''}` : 'Takeaway'}
  </span>
);

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center muted" role="status">
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="errbox" role="alert">
      {message}
      {onRetry && (
        <button className="btn sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="center muted">{children}</div>;
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const handleKeyDown = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
