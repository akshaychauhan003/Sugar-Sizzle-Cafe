'use client';
import { money } from '@/lib/api';

export default function MenuTable({
  data,
  isAdmin,
  meta,
  page,
  setPage,
  onToggle,
  onDeactivate,
  onReactivate,
  onEdit,
}) {
  return (
    <div className="card tablewrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Price</th>
            {isAdmin && <th>Cost</th>}
            <th>Prep</th>
            <th>Stock</th>
            <th>Availability</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((i) => (
            <tr key={i.id} className={i.isActive ? '' : 'inactive'}>
              <td>
                <b>{i.name}</b>
                {!i.isActive && <span className="badge st-cancelled">Inactive</span>}
                <div className="muted small">
                  {i.sku ? `${i.sku} • ` : ''}
                  {i.description}
                </div>
              </td>
              <td>
                <span className="badge type">{i.category}</span>
              </td>
              <td>
                <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                  <b>{money(i.price)}</b>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn sm"
                      style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                      onClick={async () => {
                        const newP = window.prompt(`Set new dish price for ${i.name}:`, i.price);
                        if (newP !== null && !isNaN(Number(newP)) && Number(newP) >= 0) {
                          try {
                            const { api } = await import('@/lib/api');
                            await api(`/menu/${i.id}`, { method: 'PUT', body: { price: Number(newP) } });
                            window.location.reload();
                          } catch (err) {
                            alert('Failed to update price');
                          }
                        }
                      }}
                      title="Quickly set new dish price"
                    >
                      ✏️ Set Price
                    </button>
                  )}
                </div>
              </td>
              {isAdmin && <td>{i.cost != null ? money(i.cost) : '—'}</td>}
              <td>{i.prepTimeMin} min</td>
              <td>
                <span
                  className={`badge ${
                    i.stockStatus === 'out_of_stock'
                      ? 'st-cancelled'
                      : i.stockStatus === 'low_stock'
                      ? 'st-preparing'
                      : 'st-ready'
                  }`}
                >
                  {i.stockStatus === 'out_of_stock'
                    ? 'Out of Stock'
                    : i.stockStatus === 'low_stock'
                    ? 'Low Stock'
                    : 'In Stock'}
                </span>
                {i.inventoryQuantity != null && (
                  <div className="muted small">Qty: {i.inventoryQuantity}</div>
                )}
              </td>
              <td>
                {i.isActive ? (
                  <button
                    className={`switch ${i.isAvailable ? 'on' : ''}`}
                    onClick={() => onToggle(i)}
                    aria-pressed={i.isAvailable}
                    aria-label={`Toggle availability for ${i.name}`}
                  >
                    <span />
                  </button>
                ) : (
                  '—'
                )}{' '}
                <span className="small">{i.isAvailable ? 'Active' : 'Out of stock'}</span>
              </td>
              <td className="row wrap">
                {isAdmin && i.isActive && (
                  <>
                    <button className="btn sm" onClick={() => onEdit(i)} title="Edit dish details & price">
                      Edit Dish &amp; Price
                    </button>
                    <button className="btn sm danger" onClick={() => onDeactivate(i)}>
                      Deactivate
                    </button>
                  </>
                )}
                {isAdmin && !i.isActive && (
                  <button className="btn sm" onClick={() => onReactivate(i)}>
                    Reactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="row between pager">
        <span className="muted small">
          {meta.total} items • page {meta.page} of {meta.totalPages || 1}
        </span>
        <div className="row">
          <button
            className="btn sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>
          <button
            className="btn sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
