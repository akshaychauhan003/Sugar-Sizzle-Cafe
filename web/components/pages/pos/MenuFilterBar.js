'use client';

const CAT_ICONS = {
  All: 'All Items',
  Pizzas: 'Pizzas',
  'Main Course': 'Main Course',
  Starters: 'Starters',
  Appetizers: 'Appetizers',
  Beverages: 'Beverages',
  Desserts: 'Desserts',
};

export default function MenuFilterBar({ q, setQ, cats, cat, setCat }) {
  return (
    <div className="pos-filters-panel">
      <div className="pos-search-box">
        <span className="search-icon">🔍</span>
        <input
          className="pos-search-input"
          placeholder="Search menu items… (e.g. coffee, burger, pizza, fries)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search menu items"
        />
        {q && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setQ('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="category-scroll-strip" role="tablist">
        {cats.map((c) => {
          const displayLabel = CAT_ICONS[c] || c;
          const isSelected = cat === c;
          return (
            <button
              key={c}
              type="button"
              className={`cat-pill ${isSelected ? 'active' : ''}`}
              onClick={() => setCat(c)}
            >
              <span className="cat-text">{displayLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
