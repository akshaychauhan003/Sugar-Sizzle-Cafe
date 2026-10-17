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
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;

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
      {/* Dine-In Table Picker with Strict Availability Guards */}
      {type === 'dine-in' && (
        <div className="table-picker-section">
          <div className="row between table-picker-header">
            <span className="label-text">Select Dining Table</span>
            {selectedTable && selectedTable.status === 'available' ? (
              <span className="table-selected-badge">
                ✓ Table {selectedTable.code} ({selectedTable.capacity}p)
              </span>
            ) : (
              <span className="muted small font-medium">
                {openCount} of {tables.length} tables clean &amp; ready
              </span>
            )}
          </div>

          {/* Quick status breakdown badge strip */}
          <div className="table-status-legend-bar">
            <span className="legend-chip legend-chip-avail" title="Clean and ready to seat guests">
              🟢 {openCount} Ready
            </span>
            <span className="legend-chip legend-chip-occ" title="Currently occupied with dining guests">
              🔴 {occupiedCount} Booked
            </span>
            {cleaningCount > 0 && (
              <span className="legend-chip legend-chip-clean" title="Customer left; waitstaff cleaning">
                🟡 {cleaningCount} Cleaning
              </span>
            )}
          </div>

          <div className="table-chips-grid">
            {tables.map((t) => {
              const isAvailable = t.status === 'available';
              const isOccupied = t.status === 'occupied';
              const isCleaning = t.status === 'cleaning';
              const isReserved = t.status === 'reserved';
              const isSelected = tableId === t.id && isAvailable;

              let statusLabel = `${t.capacity}p`;
              let tooltip = `Table ${t.code} (${t.capacity} seats, ${t.section || 'Main'}) — Clean & Ready`;
              let statusClass = 'status-available';

              if (isOccupied) {
                statusLabel = 'Booked';
                statusClass = 'status-occupied';
                tooltip = `Table ${t.code} is occupied by guests. Waitstaff will clear it after guests leave.`;
              } else if (isCleaning) {
                statusLabel = 'Cleaning';
                statusClass = 'status-cleaning';
                tooltip = `Table ${t.code}: Customer left. Waitstaff is currently sanitizing table.`;
              } else if (isReserved) {
                statusLabel = 'Reserved';
                statusClass = 'status-reserved';
                tooltip = `Table ${t.code} is reserved.`;
              }

              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!isAvailable}
                  className={`table-chip ${statusClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (isAvailable) {
                      setTableId(isSelected ? '' : t.id);
                    }
                  }}
                  title={tooltip}
                  aria-label={`${t.code} ${statusLabel} (${t.capacity} seats)`}
                >
                  <span className="table-code">{t.code}</span>
                  <span className="table-cap">{statusLabel}</span>
                </button>
              );
            })}
          </div>

          {selectedTable && selectedTable.status !== 'available' && (
            <p className="table-alert-error">
              ⚠️ Table {selectedTable.code} is currently{' '}
              {selectedTable.status === 'cleaning' ? 'being cleaned by waitstaff' : selectedTable.status}.
              Please select a clean green table.
            </p>
          )}
        </div>
      )}

      {/* Customer Name input */}
      <div className="guest-input-row">
        <label className="guest-label">
          <span>Customer / Guest Name (Optional)</span>
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
