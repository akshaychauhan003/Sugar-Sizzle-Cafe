'use client';

export default function OrderTypeSelector({
  type,
  setType,
  tables = [],
  tableId,
  setTableId,
  customer,
  setCustomer,
  mode = 'all', // 'switch-only' | 'details-only' | 'all'
}) {
  const selectedTable = tables.find((t) => t.id === tableId);
  const openCount = tables.filter((t) => t.status === 'available').length;

  const renderSwitch = () => (
    <div className="segmented-type-switch">
      <button
        type="button"
        className={`seg-btn ${type === 'dine-in' ? 'active' : ''}`}
        onClick={() => setType('dine-in')}
      >
        <span className="seg-icon">🍽️</span>
        <span>Dine-In</span>
      </button>
      <button
        type="button"
        className={`seg-btn ${type === 'takeaway' ? 'active' : ''}`}
        onClick={() => {
          setType('takeaway');
          setTableId('');
        }}
      >
        <span className="seg-icon">🛍️</span>
        <span>Takeaway</span>
      </button>
    </div>
  );

  const renderDetails = () => (
    <div className="order-details-box">
      {/* Dine-In Quick Table Picker */}
      {type === 'dine-in' && (
        <div className="table-picker-section">
          <div className="row between table-picker-header">
            <span className="label-text">Select Table</span>
            {selectedTable ? (
              <span className="table-selected-badge">
                ✓ {selectedTable.code} ({selectedTable.capacity}p)
              </span>
            ) : (
              <span className="muted small">{openCount} available</span>
            )}
          </div>

          <div className="table-chips-grid">
            {tables.map((t) => {
              const isSelected = tableId === t.id;
              const isOccupied = t.status === 'occupied';

              return (
                <button
                  key={t.id}
                  type="button"
                  className={`table-chip ${isSelected ? 'selected' : ''} ${isOccupied ? 'occupied' : ''}`}
                  onClick={() => setTableId(isSelected ? '' : t.id)}
                  title={`${t.code} (${t.capacity} seats, ${t.section})`}
                >
                  <span className="table-code">{t.code}</span>
                  <span className="table-cap">{t.capacity}p</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Name input */}
      <div className="guest-input-row">
        <label className="guest-label">
          <span>Customer / Table Name (Optional)</span>
          <input
            className="guest-name-input"
            value={customer}
            maxLength={60}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="e.g. Table 4, John D., or Walk-in"
          />
        </label>
      </div>
    </div>
  );

  if (mode === 'switch-only') return renderSwitch();
  if (mode === 'details-only') return renderDetails();

  return (
    <div className="order-type-box">
      {renderSwitch()}
      {renderDetails()}
    </div>
  );
}

