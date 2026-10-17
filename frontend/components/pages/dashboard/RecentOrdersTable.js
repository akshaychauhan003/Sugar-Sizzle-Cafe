'use client';
import { useMemo, useState } from 'react';
import { money } from '@/lib/api';
import { Empty, PayBadge, StatusBadge, TypeBadge } from '@/components/shared/ui';

export default function RecentOrdersTable({ orders = [], onOpenBill }) {
  const [q, setQ] = useState('');
  const [typeF, setTypeF] = useState('all');
  const [payF, setPayF] = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [sortBy, setSortBy] = useState('time');
  const [sortDir, setSortDir] = useState('desc');

  const filteredAndSorted = useMemo(() => {
    let list = [...orders];

    // Search query filter (Order number, customer name, table number)
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter((o) => {
        const orderNum = (o.orderNumber || '').toLowerCase();
        const cust = (o.customerName || '').toLowerCase();
        const table = String(o.tableNumber || '').toLowerCase();
        return orderNum.includes(term) || cust.includes(term) || table.includes(term);
      });
    }

    // Dining type filter
    if (typeF !== 'all') {
      list = list.filter((o) => o.type === typeF);
    }

    // Payment status filter
    if (payF !== 'all') {
      list = list.filter((o) => o.paymentStatus === payF);
    }

    // Order status filter
    if (statusF !== 'all') {
      list = list.filter((o) => o.status === statusF);
    }

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'time') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'total') {
        cmp = (a.total || 0) - (b.total || 0);
      } else if (sortBy === 'orderNumber') {
        cmp = (a.orderNumber || '').localeCompare(b.orderNumber || '');
      } else if (sortBy === 'type') {
        cmp = (a.type || '').localeCompare(b.type || '');
      } else if (sortBy === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (sortBy === 'payment') {
        cmp = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [orders, q, typeF, payF, statusF, sortBy, sortDir]);

  const totalFilteredSales = useMemo(() => {
    return filteredAndSorted.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [filteredAndSorted]);

  const hasActiveFilters = q || typeF !== 'all' || payF !== 'all' || statusF !== 'all';

  function handleSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir(col === 'time' || col === 'total' ? 'desc' : 'asc');
    }
  }

  function resetFilters() {
    setQ('');
    setTypeF('all');
    setPayF('all');
    setStatusF('all');
    setSortBy('time');
    setSortDir('desc');
  }

  const sortArrow = (col) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: 'var(--amber)', marginLeft: '4px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="card tablewrap" style={{ borderLeft: '4px solid #10b981', marginBottom: '20px' }}>
      {/* Header and Title */}
      <div className="row between wrap" style={{ alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>📋 Sales &amp; Completed Orders Log</h3>
            <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontWeight: 700 }}>
              {filteredAndSorted.length} of {orders.length} Orders
            </span>
          </div>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Interactive order registry with deep sorting, multi-attribute filtering, and bill inspection
          </p>
        </div>

        {filteredAndSorted.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <span className="muted small">Filtered Sales:</span>{' '}
            <b style={{ fontSize: '1.05rem', color: '#047857' }}>{money(totalFilteredSales)}</b>
          </div>
        )}
      </div>

      {/* Filter and Sort Toolbar */}
      <div
        className="row wrap"
        style={{
          gap: '8px',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'var(--bg-cream-light)',
          borderRadius: '8px',
          border: '1px solid var(--border-light)',
          marginBottom: '14px',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
          <input
            placeholder="🔍 Search order #, customer, table…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: '100%', height: '36px', fontSize: '0.86rem', paddingRight: q ? '28px' : '10px' }}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                fontWeight: 'bold',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Dining Type Filter */}
        <select
          value={typeF}
          onChange={(e) => setTypeF(e.target.value)}
          style={{ height: '36px', fontSize: '0.85rem' }}
          title="Filter by dining type"
        >
          <option value="all">🍽️ All Dining Types</option>
          <option value="dine-in">Dine-in Only</option>
          <option value="takeaway">Takeaway (To-Go)</option>
        </select>

        {/* Payment Status Filter */}
        <select
          value={payF}
          onChange={(e) => setPayF(e.target.value)}
          style={{ height: '36px', fontSize: '0.85rem' }}
          title="Filter by payment status"
        >
          <option value="all">💳 All Payments</option>
          <option value="paid">Paid</option>
          <option value="partial">Partially Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>

        {/* Order Status Filter */}
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          style={{ height: '36px', fontSize: '0.85rem' }}
          title="Filter by workflow status"
        >
          <option value="all">⚡ All Statuses</option>
          <option value="completed">Completed</option>
          <option value="delivered">Delivered to Table</option>
          <option value="ready">Ready for Pickup</option>
          <option value="preparing">Cooking in Kitchen</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Sort Dropdown */}
        <div className="row" style={{ alignItems: 'center', gap: '4px' }}>
          <span className="muted small" style={{ fontWeight: 600 }}>Sort:</span>
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [b, d] = e.target.value.split('-');
              setSortBy(b);
              setSortDir(d);
            }}
            style={{ height: '36px', fontSize: '0.85rem' }}
          >
            <option value="time-desc">🕒 Newest First</option>
            <option value="time-asc">🕒 Oldest First</option>
            <option value="total-desc">💰 Highest Amount</option>
            <option value="total-asc">💰 Lowest Amount</option>
            <option value="orderNumber-asc">🏷️ Order # (A-Z)</option>
            <option value="orderNumber-desc">🏷️ Order # (Z-A)</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn sm"
            onClick={resetFilters}
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 12px' }}
            title="Clear all active filters"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {filteredAndSorted.length === 0 ? (
        <Empty>
          {orders.length === 0
            ? 'No orders found for this time period.'
            : 'No orders match your filter criteria. Try adjusting or resetting filters.'}
        </Empty>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('orderNumber')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by order number"
                >
                  Order #{sortArrow('orderNumber')}
                </th>
                <th
                  onClick={() => handleSort('time')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by creation time"
                >
                  Time{sortArrow('time')}
                </th>
                <th
                  onClick={() => handleSort('type')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by dining channel"
                >
                  Channel{sortArrow('type')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by workflow status"
                >
                  Status{sortArrow('status')}
                </th>
                <th
                  onClick={() => handleSort('payment')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by payment status"
                >
                  Payment{sortArrow('payment')}
                </th>
                <th
                  className="r"
                  onClick={() => handleSort('total')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by total amount"
                >
                  Total{sortArrow('total')}
                </th>
                <th style={{ textAlign: 'center', width: '90px' }}>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>{o.orderNumber.replace('ORD-', '#')}</b>
                    {o.customerName && (
                      <div className="muted small" style={{ fontSize: '0.78rem' }}>
                        {o.customerName}
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(o.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <TypeBadge type={o.type} table={o.tableNumber} />
                  </td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    <PayBadge status={o.paymentStatus} />
                  </td>
                  <td className="r">
                    <b style={{ color: o.paymentStatus === 'paid' ? '#047857' : 'var(--ink)' }}>
                      {money(o.total)}
                    </b>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn sm"
                      onClick={() => onOpenBill(o)}
                      title="Inspect full invoice, taxes, items, and payments"
                    >
                      View Bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
