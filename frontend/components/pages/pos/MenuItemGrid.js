'use client';
import { money } from '@/lib/api';
import { Empty, Spinner } from '@/components/shared/ui';

const DISH_ICONS = {
  Pizzas: '🍕',
  'Main Course': '🍔',
  Starters: '🍟',
  Appetizers: '🥗',
  Beverages: '☕',
  Desserts: '🍰',
};

const FLAVOR_TAGS = {
  'Cold Brew Tonic': 'Signature Coffee',
  'Classic Margherita Pizza': 'Chef Special',
  'Truffle Wagyu Burger': 'Best Seller',
  'Crispy Calamari Fritti': 'Crispy Starter',
  'Traditional Venetian Tiramisu': 'Classic Dessert',
  'Wild Mushroom & Truffle Risotto': 'Signature Dish',
  'Crispy Truffle Fries': 'Popular',
  'Smoked Chicken Wings': 'Chef Special',
  'Molten Dark Choco Lava': 'Signature Dessert',
  'Sparkling Yuzu Cooler': 'Refreshing',
  'Mango Lychee Fizz': 'Fruit Blend',
  'Pan-Seared Sea Bass': 'Chef Special',
  'Caramel Macchiato': 'House Blend',
};

export default function MenuItemGrid({ menu, shown, cart = [], onAddItem }) {
  if (!menu) return <Spinner />;
  if (shown.length === 0) {
    return (
      <Empty>
        <div style={{ padding: '32px 16px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🍽️</div>
          <b>No menu items match your search.</b>
          <p className="muted small">Try searching a different item or select another category above.</p>
        </div>
      </Empty>
    );
  }

  // Map of itemId -> count in cart
  const cartCounts = {};
  for (const c of cart) {
    cartCounts[c.id] = (cartCounts[c.id] || 0) + c.quantity;
  }

  return (
    <div className="dish-grid">
      {shown.map((m) => {
        const out = !m.isAvailable || m.stockStatus === 'out_of_stock' || (m.inventoryQuantity != null && m.inventoryQuantity <= 0);
        const inCart = cartCounts[m.id] || 0;
        const icon = DISH_ICONS[m.category] || '🍽️';
        const tag = FLAVOR_TAGS[m.name] || 'Chef Special';

        return (
          <button
            key={m.id}
            type="button"
            className={`dish-card ${out ? 'out-of-stock disabled' : ''} ${inCart > 0 ? 'selected-in-cart' : ''}`}
            disabled={out}
            onClick={() => onAddItem(m)}
            aria-label={out ? `${m.name} is out of stock and cannot be made` : `Add ${m.name} to order`}
            title={out ? `${m.name} is out of stock and cannot be prepared` : `Click to add ${m.name}`}
          >
            {inCart > 0 && <span className="cart-count-badge">{inCart} in order</span>}

            <div className="dish-header">
              <span className="dish-emoji">{icon}</span>
              <span className={`flavor-tag-pill ${out ? 'out-of-stock-tag' : ''}`}>
                {out ? 'Out of Stock' : tag}
              </span>
            </div>

            <div className="dish-body">
              <h4 className="dish-name">{m.name}</h4>
              {m.description && <p className="dish-desc">{m.description}</p>}
            </div>

            <div className="dish-footer">
              <div className="dish-price-tag">{money(m.price)}</div>
              <div className="dish-meta">
                {m.prepTimeMin != null && !out && <span className="prep-time">{m.prepTimeMin}m prep</span>}
                {m.stockStatus === 'low_stock' && !out && (
                  <span className="badge st-preparing">Low stock</span>
                )}
                {out && <span className="out-of-stock-tag">Out of stock • Cannot be made</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
