'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errMsg, money } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { ErrorBox, Modal, Spinner } from '@/components/shared/ui';

export default function StockManager({ role = 'kitchen' }) {
  const toast = useToast();
  const [stocks, setStocks] = useState(null);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editStock, setEditStock] = useState(null);
  const [busy, setBusy] = useState(false);

  // New stock form state
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('Dairy');
  const [newQuantity, setNewQuantity] = useState(10);
  const [newUnit, setNewUnit] = useState('kg');
  const [newCostPrice, setNewCostPrice] = useState(100);
  const [newSupplier, setNewSupplier] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const loadStocks = useCallback(async () => {
    try {
      const res = await api('/stocks');
      setStocks(res.data || []);
      setStats(res.stats || {});
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    }
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const filteredStocks = (stocks || []).filter((s) => {
    if (filterCategory && s.category !== filterCategory) return false;
    if (filterStatus === 'expiring_soon' && s.expiryStatus !== 'expiring_soon') return false;
    if (filterStatus === 'expired' && s.expiryStatus !== 'expired') return false;
    if (filterStatus === 'low_stock' && s.status !== 'low_stock' && s.quantity > 5) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.itemName?.toLowerCase().includes(q) ||
        s.supplier?.toLowerCase().includes(q) ||
        s.batchNumber?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleAddStock(e) {
    e.preventDefault();
    if (!newItemName.trim() || !newExpiryDate) {
      return toast('Item name and expiry date are required', 'err');
    }
    setBusy(true);
    try {
      await api('/stocks', {
        method: 'POST',
        body: {
          itemName: newItemName.trim(),
          category: newCategory,
          quantity: Number(newQuantity),
          unit: newUnit,
          costPrice: Number(newCostPrice),
          supplier: newSupplier.trim() || 'Local Supplier',
          expiryDate: newExpiryDate,
          notes: newNotes.trim(),
        },
      });
      toast(`Stock batch for ${newItemName} added successfully`);
      setShowAddModal(false);
      // Reset
      setNewItemName('');
      setNewQuantity(10);
      setNewCostPrice(100);
      setNewExpiryDate('');
      setNewNotes('');
      await loadStocks();
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateQuantity(stock, newQty) {
    try {
      await api(`/stocks/${stock.id}`, {
        method: 'PATCH',
        body: { quantity: Number(newQty) },
      });
      toast(`Updated ${stock.itemName} quantity to ${newQty} ${stock.unit}`);
      await loadStocks();
    } catch (err) {
      toast(errMsg(err), 'err');
    }
  }

  async function handleDeleteStock(stock) {
    if (!window.confirm(`Delete stock batch ${stock.batchNumber} (${stock.itemName})?`)) return;
    try {
      await api(`/stocks/${stock.id}`, { method: 'DELETE' });
      toast('Stock batch deleted');
      await loadStocks();
    } catch (err) {
      toast(errMsg(err), 'err');
    }
  }

  const categories = [
    'Dairy',
    'Meat & Seafood',
    'Produce',
    'Coffee & Tea',
    'Bakery',
    'Dry Goods',
    'Beverages',
    'General',
  ];

  return (
    <div style={{ marginTop: '14px' }}>
      {/* Top Header & Quick Add */}
      <div className="row between wrap" style={{ marginBottom: '14px', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--espresso)' }}>Stock Inventory & Expiry Tracker</h3>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Monitor ingredient stock levels, batch numbers, and perishable expiry dates
          </p>
        </div>
        <div className="row" style={{ gap: '8px' }}>
          <button className="btn" onClick={loadStocks}>
            ↻ Refresh
          </button>
          <button className="btn primary" onClick={() => setShowAddModal(true)}>
            + Add Stock Purchase
          </button>
        </div>
      </div>

      {err && <ErrorBox message={err} onRetry={loadStocks} />}

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          className="card"
          style={{
            padding: '12px 14px',
            borderLeft: '4px solid var(--coffee)',
            background: 'var(--surface)',
          }}
        >
          <div className="muted small">Total Stock Batches</div>
          <b style={{ fontSize: '1.4rem', color: 'var(--espresso)' }}>{stats?.totalBatches || 0}</b>
          <div className="small muted">active ingredient lots</div>
        </div>

        <div
          className="card"
          style={{
            padding: '12px 14px',
            borderLeft: '4px solid #f59e0b',
            background: stats?.expiringSoonCount > 0 ? '#fffbeb' : 'var(--surface)',
          }}
        >
          <div className="muted small" style={{ color: '#b45309' }}>
            ⚠️ Expiring Soon (≤ 5 Days)
          </div>
          <b style={{ fontSize: '1.4rem', color: '#b45309' }}>{stats?.expiringSoonCount || 0}</b>
          <div className="small muted">requires immediate kitchen use</div>
        </div>

        <div
          className="card"
          style={{
            padding: '12px 14px',
            borderLeft: '4px solid #ef4444',
            background: stats?.expiredCount > 0 ? '#fef2f2' : 'var(--surface)',
          }}
        >
          <div className="muted small" style={{ color: '#b91c1c' }}>
            🔴 Expired Stock
          </div>
          <b style={{ fontSize: '1.4rem', color: '#b91c1c' }}>{stats?.expiredCount || 0}</b>
          <div className="small muted">discard / do not serve</div>
        </div>

        <div
          className="card"
          style={{
            padding: '12px 14px',
            borderLeft: '4px solid #64748b',
            background: 'var(--surface)',
          }}
        >
          <div className="muted small">Low Stock Items</div>
          <b style={{ fontSize: '1.4rem', color: 'var(--ink)' }}>{stats?.lowStockCount || 0}</b>
          <div className="small muted">under threshold (≤ 5 units)</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '12px',
          marginBottom: '14px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="row wrap" style={{ gap: '8px', alignItems: 'center' }}>
          <input
            placeholder="Search ingredient, batch #, supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '240px', minHeight: '36px' }}
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ minHeight: '36px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="row wrap" style={{ gap: '6px' }}>
          <button
            type="button"
            className={`btn sm ${filterStatus === 'all' ? 'primary' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All Batches
          </button>
          <button
            type="button"
            className={`btn sm ${filterStatus === 'expiring_soon' ? 'primary' : ''}`}
            onClick={() => setFilterStatus('expiring_soon')}
            style={
              filterStatus === 'expiring_soon'
                ? { background: '#f59e0b', borderColor: '#d97706', color: '#fff' }
                : {}
            }
          >
            ⚠️ Expiring Soon
          </button>
          <button
            type="button"
            className={`btn sm ${filterStatus === 'expired' ? 'primary' : ''}`}
            onClick={() => setFilterStatus('expired')}
            style={
              filterStatus === 'expired'
                ? { background: '#ef4444', borderColor: '#dc2626', color: '#fff' }
                : {}
            }
          >
            🔴 Expired
          </button>
          <button
            type="button"
            className={`btn sm ${filterStatus === 'low_stock' ? 'primary' : ''}`}
            onClick={() => setFilterStatus('low_stock')}
          >
            📉 Low Stock
          </button>
        </div>
      </div>

      {/* Stocks Table */}
      {!stocks ? (
        <Spinner />
      ) : filteredStocks.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
          <b>No stock items match your filter criteria.</b>
          <p className="muted small">Try adjusting your filters or click &quot;+ Add Stock Purchase&quot;.</p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1.5px solid var(--border-light)' }}>
                <th style={{ padding: '10px 14px' }}>Item &amp; Category</th>
                <th style={{ padding: '10px 14px' }}>Batch # &amp; Supplier</th>
                <th style={{ padding: '10px 14px' }}>Quantity</th>
                <th style={{ padding: '10px 14px' }}>Cost Price</th>
                <th style={{ padding: '10px 14px' }}>Expiry Date</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((s) => {
                const isExpired = s.expiryStatus === 'expired';
                const isExpiringSoon = s.expiryStatus === 'expiring_soon';
                const expiryDateStr = s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : 'N/A';

                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      background: isExpired ? '#fef2f2' : isExpiringSoon ? '#fffbeb' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <b style={{ color: 'var(--espresso)', display: 'block' }}>{s.itemName}</b>
                      <span className="muted small">{s.category}</span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: '0.78rem', background: 'rgba(0,0,0,0.04)', padding: '2px 4px', borderRadius: '4px' }}>
                        {s.batchNumber || '—'}
                      </code>
                      <div className="small muted">{s.supplier}</div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <b style={{ color: s.quantity <= 5 ? '#b91c1c' : 'inherit' }}>
                        {s.quantity} {s.unit}
                      </b>
                      {s.quantity <= 5 && <div className="small" style={{ color: '#dc2626' }}>Low Stock</div>}
                    </td>

                    <td style={{ padding: '12px 14px' }}>{money(s.costPrice)}</td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{expiryDateStr}</div>
                      {isExpired ? (
                        <span className="badge st-cancelled" style={{ fontSize: '0.7rem' }}>
                          Expired {Math.abs(s.daysUntilExpiry)}d ago
                        </span>
                      ) : isExpiringSoon ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#92400e',
                            background: '#fef3c7',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          Expires in {s.daysUntilExpiry} days!
                        </span>
                      ) : (
                        <span className="small muted">Fresh ({s.daysUntilExpiry} days left)</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {isExpired ? (
                        <span className="badge st-cancelled">Expired</span>
                      ) : s.quantity === 0 ? (
                        <span className="badge st-cancelled">Out of stock</span>
                      ) : s.quantity <= 5 ? (
                        <span className="badge st-preparing">Low stock</span>
                      ) : (
                        <span className="badge st-completed">In stock</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div className="row end" style={{ gap: '6px' }}>
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => {
                            const newQty = window.prompt(`Update quantity for ${s.itemName} (${s.unit}):`, s.quantity);
                            if (newQty !== null && !isNaN(Number(newQty))) {
                              handleUpdateQuantity(s, newQty);
                            }
                          }}
                          title="Adjust stock quantity"
                        >
                          Qty ±
                        </button>

                        {role === 'admin' && (
                          <button
                            type="button"
                            className="btn sm danger"
                            onClick={() => handleDeleteStock(s)}
                            title="Delete stock batch"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddModal && (
        <Modal title="Add Stock Purchase / Batch" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddStock} className="stack">
            <label>
              Ingredient / Item Name
              <input
                required
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Buffalo Mozzarella, Truffle Oil, Wagyu Beef"
                autoFocus
              />
            </label>

            <div className="row wrap" style={{ gap: '12px' }}>
              <label style={{ flex: 1 }}>
                Category
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ flex: 1 }}>
                Unit of Measure
                <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="L">L (Liters)</option>
                  <option value="units">units (Pieces)</option>
                  <option value="packs">packs</option>
                  <option value="cans">cans</option>
                  <option value="jars">jars</option>
                  <option value="boxes">boxes</option>
                </select>
              </label>
            </div>

            <div className="row wrap" style={{ gap: '12px' }}>
              <label style={{ flex: 1 }}>
                Quantity Purchased
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                />
              </label>

              <label style={{ flex: 1 }}>
                Cost Price ({money(0).slice(0, 1)})
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newCostPrice}
                  onChange={(e) => setNewCostPrice(e.target.value)}
                />
              </label>
            </div>

            <div className="row wrap" style={{ gap: '12px' }}>
              <label style={{ flex: 1 }}>
                Supplier / Vendor
                <input
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="e.g. Artisan Valley Farms"
                />
              </label>

              <label style={{ flex: 1 }}>
                Expiry Date *
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                />
              </label>
            </div>

            <label>
              Storage / Kitchen Notes (Optional)
              <input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Keep chilled below 4°C, inspect seal before use"
              />
            </label>

            <div className="row end" style={{ marginTop: '14px', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setShowAddModal(false)} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? 'Saving Batch…' : 'Record Stock Purchase'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
