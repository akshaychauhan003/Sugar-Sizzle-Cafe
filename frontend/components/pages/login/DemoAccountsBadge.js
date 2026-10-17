'use client';

const DEMOS = [
  {
    role: 'Admin',
    icon: '👑',
    badge: 'Full Access & Analytics',
    id: 'admin',
    email: 'admin@sugarsizzle.com',
    pass: 'Admin@123',
  },
  {
    role: 'Cashier',
    icon: '🧾',
    badge: 'Drinks POS & Checkout',
    id: 'cashier',
    email: 'cashier@sugarsizzle.com',
    pass: 'Cashier@123',
  },
  {
    role: 'Chef / Barista',
    icon: '🍳',
    badge: 'KDS & Stock Expiry',
    id: 'chef',
    email: 'chef@sugarsizzle.com',
    pass: 'Chef@123',
  },
  {
    role: 'Waitstaff',
    icon: '🍽️',
    badge: 'Delivery & Table Cleaning',
    id: 'staff',
    email: 'staff@sugarsizzle.com',
    pass: 'Staff@123',
  },
  {
    role: 'Manager',
    icon: '📋',
    badge: 'Shifts & Discounts',
    id: 'manager',
    email: 'manager@sugarsizzle.com',
    pass: 'Manager@123',
  },
];

export default function DemoAccountsBadge({ onSelect, selectedEmail }) {
  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <b style={{ fontSize: '0.86rem', color: 'var(--espresso)' }}>Quick Staff Logins (Click to Fill)</b>
        <p className="muted small" style={{ margin: '2px 0 0', fontSize: '0.78rem' }}>
          Log in with simple User ID or full email
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '8px',
        }}
      >
        {DEMOS.map((d) => {
          const isSelected = selectedEmail === d.id || selectedEmail === d.email;
          return (
            <div
              key={d.id}
              onClick={() => onSelect(d.id, d.pass)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(d.id, d.pass);
                }
              }}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: isSelected ? '1.5px solid var(--coffee)' : '1px solid var(--border-light)',
                background: isSelected ? 'var(--cream)' : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                boxShadow: isSelected ? '0 2px 6px rgba(44, 24, 16, 0.12)' : 'none',
              }}
              title={`Click to fill ${d.role} credentials (${d.id} / ${d.pass})`}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--espresso)' }}>
                  {d.icon} {d.role}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(217, 119, 6, 0.12)',
                    color: '#92400e',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  {d.badge}
                </span>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>User ID:</span>
                <strong style={{ color: 'var(--coffee-dark)', background: '#f3f4f6', padding: '1px 6px', borderRadius: '4px' }}>
                  {d.id}
                </strong>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password:</span>
                <code
                  style={{
                    background: 'rgba(220, 38, 38, 0.08)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#b91c1c',
                    fontWeight: 700,
                  }}
                >
                  {d.pass}
                </code>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
