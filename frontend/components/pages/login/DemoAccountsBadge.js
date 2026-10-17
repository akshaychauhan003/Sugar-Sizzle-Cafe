'use client';

const DEMOS = [
  {
    role: 'Admin',
    icon: '👑',
    badge: 'Full Access & Stocks',
    email: 'admin@restoflow.test',
    pass: 'Admin@12345',
  },
  {
    role: 'Cashier',
    icon: '🧾',
    badge: 'POS & Billing',
    email: 'cashier@restoflow.test',
    pass: 'Cashier@12345',
  },
  {
    role: 'Kitchen / Chef',
    icon: '🍳',
    badge: 'KDS & Stock Expiry',
    email: 'kitchen@restoflow.test',
    pass: 'Kitchen@12345',
  },
  {
    role: 'Waitstaff',
    icon: '🍽️',
    badge: 'Cooking & Delivery',
    email: 'staff@restoflow.test',
    pass: 'Staff@12345',
  },
];

export default function DemoAccountsBadge({ onSelect, selectedEmail }) {
  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <b style={{ fontSize: '0.86rem', color: 'var(--espresso)' }}>Quick Demo Logins (Click to Fill)</b>
        <p className="muted small" style={{ margin: '2px 0 0', fontSize: '0.78rem' }}>
          Role, User ID, and Password credentials shown below
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '8px',
        }}
      >
        {DEMOS.map((d) => {
          const isSelected = selectedEmail === d.email;
          return (
            <div
              key={d.email}
              onClick={() => onSelect(d.email, d.pass)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(d.email, d.pass);
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
              title={`Click to fill ${d.role} credentials`}
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
                    fontWeight: 500,
                  }}
                >
                  {d.badge}
                </span>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>User ID:</span>
                <strong style={{ color: 'var(--ink)' }}>{d.email}</strong>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Password:</span>
                <code
                  style={{
                    background: 'rgba(0,0,0,0.05)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--chili)',
                    fontWeight: 600,
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
