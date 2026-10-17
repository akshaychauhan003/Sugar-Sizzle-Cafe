'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errMsg, timeAgo } from '@/lib/api';
import { useToast } from '@/components/shared/AuthProvider';
import { Empty, ErrorBox, Modal, Spinner } from '@/components/shared/ui';

export default function ChefStockView() {
  const toast = useToast();
  const [stocks, setStocks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'fresh' | 'will_expire' | 'expired' | 'out_of_stock' | 'needed'
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState('');

  // Wastage modal state
  const [wasteItem, setWasteItem] = useState(null);
  const [wasteQty, setWasteQty] = useState(1);
  const [wasteReason, setWasteReason] = useState('Expired Batch');

  const load = useCallback(async () => {
    try {
      const res = await api('/stocks');
      setStocks(res.data || []);
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // Compute stock classifications for Chef
  const classifiedStocks = (stocks || []).map((s) => {
    const isOutOfStock = s.quantity === 0 || s.status === 'out_of_stock';
    const isExpired = s.daysUntilExpiry < 0 || s.status === 'expired';
    const isWillExpire = !isExpired && s.daysUntilExpiry >= 0 && s.daysUntilExpiry <= 7;
    const isFresh = !isExpired && !isWillExpire && s.daysUntilExpiry > 7 && s.quantity > (s.minimumQuantity || 5);
    const isNeeded = s.quantity <= (s.minimumQuantity || 5) || isOutOfStock;

    return {
      ...s,
      isFresh,
      isWillExpire,
      isExpired,
      isOutOfStock,
      isNeeded,
    };
  });

  const counts = {
    all: classifiedStocks.length,
    fresh: classifiedStocks.filter((s) => s.isFresh).length,
    will_expire: classifiedStocks.filter((s) => s.isWillExpire).length,
    expired: classifiedStocks.filter((s) => s.isExpired).length,
    out_of_stock: classifiedStocks.filter((s) => s.isOutOfStock).length,
    needed: classifiedStocks.filter((s) => s.isNeeded).length,
  };

  const filtered = classifiedStocks.filter((s) => {
    if (activeFilter === 'fresh' && !s.isFresh) return false;
    if (activeFilter === 'will_expire' && !s.isWillExpire) return false;
    if (activeFilter === 'expired' && !s.isExpired) return false;
    if (activeFilter === 'out_of_stock' && !s.isOutOfStock) return false;
    if (activeFilter === 'needed' && !s.isNeeded) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.itemName?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.batchNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleRequestRestock(stock) {
    setActing(stock.id);
    try {
      await api(`/stocks/${stock.id}/request-replenish`, { method: 'POST' });
      toast(`Restock request sent to Admin for "${stock.itemName}"`);
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  async function handleRecordWaste() {
    if (!wasteItem) return;
    setActing(wasteItem.id);
    try {
      await api(`/stocks/${wasteItem.id}/waste`, {
        method: 'POST',
        body: {
          wastedQuantity: Number(wasteQty) || wasteItem.quantity,
          reason: wasteReason,
        },
      });
      toast(`Recorded spoilage for ${wasteItem.itemName}`);
      setWasteItem(null);
      await load();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setActing('');
    }
  }

  if (loading && !stocks) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Chef Product Health Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* 1. Fresh */}
        <div
          onClick={() => setActiveFilter('fresh')}
          style={{
            cursor: 'pointer',
            padding: '14px',
            background: activeFilter === 'fresh' ? '#dcfce7' : '#ffffff',
            borderRadius: '10px',
            border: activeFilter === 'fresh' ? '2px solid #16a34a' : '1.5px solid var(--border-light)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d' }}>
            🟢 FRESH INGREDIENTS
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
            {counts.fresh}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#166534' }}>
            Healthy shelf life (&gt; 7 days)
          </div>
        </div>

        {/* 2. Will Expire */}
        <div
          onClick={() => setActiveFilter('will_expire')}
          style={{
            cursor: 'pointer',
            padding: '14px',
            background: activeFilter === 'will_expire' ? '#fef3c7' : '#ffffff',
            borderRadius: '10px',
            border: activeFilter === 'will_expire' ? '2px solid #d97706' : '1.5px solid #fde68a',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>
            🟡 WILL EXPIRE SOON
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '4px 0' }}>
            {counts.will_expire}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#92400e' }}>
            Expiring in &le; 7 days (Use First)
          </div>
        </div>

        {/* 3. Expired */}
        <div
          onClick={() => setActiveFilter('expired')}
          style={{
            cursor: 'pointer',
            padding: '14px',
            background: activeFilter === 'expired' ? '#fee2e2' : '#ffffff',
            borderRadius: '10px',
            border: activeFilter === 'expired' ? '2px solid #dc2626' : (counts.expired > 0 ? '1.5px solid #fca5a5' : '1.5px solid var(--border-light)'),
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c' }}>
            🔴 EXPIRED (DO NOT USE)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
            {counts.expired}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#991b1b' }}>
            Past expiration date • Needs disposal
          </div>
        </div>

        {/* 4. Out of Stock */}
        <div
          onClick={() => setActiveFilter('out_of_stock')}
          style={{
            cursor: 'pointer',
            padding: '14px',
            background: activeFilter === 'out_of_stock' ? '#f3f4f6' : '#ffffff',
            borderRadius: '10px',
            border: activeFilter === 'out_of_stock' ? '2px solid #6b7280' : '1.5px solid var(--border-light)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4b5563' }}>
            ⚪ OUT OF STOCK
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6b7280', margin: '4px 0' }}>
            {counts.out_of_stock}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
            0 quantity on hand • Cannot cook dish
          </div>
        </div>

        {/* 5. What is Needed */}
        <div
          onClick={() => setActiveFilter('needed')}
          style={{
            cursor: 'pointer',
            padding: '14px',
            background: activeFilter === 'needed' ? '#ffedd5' : '#ffffff',
            borderRadius: '10px',
            border: activeFilter === 'needed' ? '2px solid #ea580c' : '1.5px solid #fed7aa',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c' }}>
            ⚠️ WHAT IS NEEDED
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c', margin: '4px 0' }}>
            {counts.needed}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#9a3412' }}>
            Below safety threshold • Restock now
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div className="row between wrap" style={{ alignItems: 'center', gap: '12px' }}>
          {/* Segmented Filter Pills */}
          <div className="segmented-tab-bar" role="tablist">
            <button
              type="button"
              className={`seg-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <span className="tab-label">All Kitchen Products</span>
              <span className="tab-pill-badge">{counts.all}</span>
            </button>
            <button
              type="button"
              className={`seg-tab ${activeFilter === 'fresh' ? 'active' : ''}`}
              onClick={() => setActiveFilter('fresh')}
              style={activeFilter === 'fresh' ? { borderColor: '#16a34a', color: '#16a34a' } : {}}
            >
              <span className="tab-icon">🟢</span>
              <span className="tab-label">Fresh</span>
              <span className="tab-pill-badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                {counts.fresh}
              </span>
            </button>
            <button
              type="button"
              className={`seg-tab ${activeFilter === 'will_expire' ? 'active' : ''}`}
              onClick={() => setActiveFilter('will_expire')}
              style={activeFilter === 'will_expire' ? { borderColor: '#d97706', color: '#d97706' } : {}}
            >
              <span className="tab-icon">🟡</span>
              <span className="tab-label">Will Expire</span>
              <span className="tab-pill-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                {counts.will_expire}
              </span>
            </button>
            <button
              type="button"
              className={`seg-tab ${activeFilter === 'expired' ? 'active' : ''}`}
              onClick={() => setActiveFilter('expired')}
              style={activeFilter === 'expired' ? { borderColor: '#dc2626', color: '#dc2626' } : {}}
            >
              <span className="tab-icon">🔴</span>
              <span className="tab-label">Expired</span>
              <span className="tab-pill-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                {counts.expired}
              </span>
            </button>
            <button
              type="button"
              className={`seg-tab ${activeFilter === 'out_of_stock' ? 'active' : ''}`}
              onClick={() => setActiveFilter('out_of_stock')}
              style={activeFilter === 'out_of_stock' ? { borderColor: '#6b7280', color: '#374151' } : {}}
            >
              <span className="tab-icon">⚪</span>
              <span className="tab-label">Out of Stock</span>
              <span className="tab-pill-badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>
                {counts.out_of_stock}
              </span>
            </button>
            <button
              type="button"
              className={`seg-tab ${activeFilter === 'needed' ? 'active' : ''}`}
              onClick={() => setActiveFilter('needed')}
              style={activeFilter === 'needed' ? { borderColor: '#ea580c', color: '#ea580c' } : {}}
            >
              <span className="tab-icon">⚠️</span>
              <span className="tab-label">What is Needed</span>
              <span className="tab-pill-badge" style={{ background: '#ffedd5', color: '#c2410c' }}>
                {counts.needed}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="search-input-wrapper" style={{ minWidth: '220px' }}>
            <span className="search-icon">🔍</span>
            <input
              className="order-search-input"
              placeholder="Search ingredient, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search kitchen products"
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {err && <ErrorBox message={err} onRetry={load} />}

      {/* Products Table */}
      {filtered.length === 0 ? (
        <Empty>No kitchen products match the selected criteria.</Empty>
      ) : (
        <div className="card tablewrap" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="tbl" style={{ width: '100%', minWidth: '750px' }}>
            <thead>
              <tr>
                <th>Ingredient / Product</th>
                <th>Category</th>
                <th style={{ textAlign: 'center' }}>Available Quantity</th>
                <th style={{ textAlign: 'center' }}>Safety Level</th>
                <th>Expiry / Shelf Life Status</th>
                <th style={{ textAlign: 'right' }}>Chef Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const days = s.daysUntilExpiry;
                let statusBadge = null;
                if (s.isExpired) {
                  statusBadge = (
                    <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                      🔴 EXPIRED ({days < 0 ? `${Math.abs(days)}d ago` : 'Today'})
                    </span>
                  );
                } else if (s.isWillExpire) {
                  statusBadge = (
                    <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                      🟡 WILL EXPIRE ({days}d left • Use First)
                    </span>
                  );
                } else if (s.isFresh) {
                  statusBadge = (
                    <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                      🟢 FRESH ({days}d shelf life)
                    </span>
                  );
                }

                return (
                  <tr key={s.id} style={s.isExpired ? { background: '#fff5f5' } : s.isOutOfStock ? { background: '#f9fafb' } : {}}>
                    <td>
                      <div>
                        <b style={{ color: s.isOutOfStock ? '#9ca3af' : 'var(--coffee-dark)', fontSize: '0.92rem' }}>
                          {s.itemName}
                        </b>
                        <div className="muted small" style={{ fontSize: '0.75rem' }}>
                          Batch #{s.batchNumber || 'N/A'} • Exp: {s.expiryDate?.slice(0, 10)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-cream-light)', color: 'var(--ink)' }}>
                        {s.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <b
                        style={{
                          fontSize: '1rem',
                          color: s.isOutOfStock ? '#dc2626' : s.quantity <= (s.minimumQuantity || 5) ? '#d97706' : '#16a34a',
                        }}
                      >
                        {s.quantity} {s.unit}
                      </b>
                      {s.isOutOfStock && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>
                          OUT OF STOCK
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="muted small">
                        Min: {s.minimumQuantity || 5} {s.unit}
                      </span>
                      {s.isNeeded && (
                        <div>
                          <span
                            className="badge"
                            style={{
                              background: '#ffedd5',
                              color: '#c2410c',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              marginTop: '2px',
                            }}
                          >
                            ⚠️ Restock Needed
                          </span>
                        </div>
                      )}
                    </td>
                    <td>{statusBadge}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: '6px' }}>
                        {s.isNeeded && (
                          <button
                            type="button"
                            className="btn sm"
                            disabled={acting === s.id}
                            onClick={() => handleRequestRestock(s)}
                            title="Send instant restock notification to management"
                            style={{ background: '#ffedd5', borderColor: '#fed7aa', color: '#c2410c', fontWeight: 600 }}
                          >
                            📢 Request Restock
                          </button>
                        )}
                        {s.isExpired && (
                          <button
                            type="button"
                            className="btn sm danger"
                            onClick={() => {
                              setWasteItem(s);
                              setWasteQty(s.quantity > 0 ? s.quantity : 1);
                              setWasteReason('Expired Batch');
                            }}
                            title="Record spoiled or expired ingredient disposal"
                          >
                            🗑️ Record Waste
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

      {/* Wastage Disposal Modal */}
      {wasteItem && (
        <Modal onClose={() => setWasteItem(null)}>
          <div style={{ padding: '8px' }}>
            <h3 style={{ margin: '0 0 8px', color: '#b91c1c' }}>
              🗑️ Record Ingredient Spoilage / Wastage
            </h3>
            <p className="muted small" style={{ margin: '0 0 16px' }}>
              Mark spoiled batch <b>{wasteItem.itemName}</b> as disposed. This removes it from kitchen cooking.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRecordWaste();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label className="small" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                  Quantity to Dispose ({wasteItem.unit}):
                </label>
                <input
                  type="number"
                  min="0.1"
                  max={Math.max(wasteItem.quantity, 100)}
                  step="0.1"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="small" style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
                  Disposal / Waste Reason:
                </label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                >
                  <option value="Expired Batch">Expired Batch</option>
                  <option value="Mold / Visual Spoilage">Mold / Visual Spoilage</option>
                  <option value="Unsealed / Contaminated">Unsealed / Contaminated</option>
                  <option value="Cooking Burn / Waste">Cooking Burn / Kitchen Waste</option>
                </select>
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn" onClick={() => setWasteItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn danger" disabled={acting === wasteItem.id}>
                  {acting === wasteItem.id ? 'Recording…' : 'Confirm Waste Disposal'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
