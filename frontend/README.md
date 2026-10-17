# RestoFlow POS — Frontend (Next.js 14)

Next.js 14 (App Router) frontend for the RestoFlow API in `../backend`.

## 📁 Page-Based Directory Structure

The project components and pages are structured **strictly by page name** so that making edits to any page is straightforward and intuitive:

```
frontend/
├── app/                                 # Next.js App Router (Route entrypoints)
│   ├── (app)/
│   │   ├── layout.js                    # Protected shell layout
│   │   ├── page.js                      # Route: / (Dashboard & Reports)
│   │   ├── pos/page.js                  # Route: /pos (POS Terminal)
│   │   ├── orders/page.js               # Route: /orders (Live Orders Workflow)
│   │   ├── menu/page.js                 # Route: /menu (Menu Catalog & Management)
│   │   └── kitchen/page.js              # Route: /kitchen (Kitchen Display System)
│   ├── login/page.js                    # Route: /login (Authentication)
│   ├── globals.css                      # Global styles and theme tokens
│   └── layout.js                        # Root HTML layout with AuthProvider
│
├── components/
│   ├── pages/                           # ⭐ STRUCTURED BY PAGE NAME ⭐
│   │   │
│   │   ├── dashboard/                   # 📊 Page: / (Reports & Daily Sales)
│   │   │   ├── index.js                 # Main Dashboard Page component
│   │   │   ├── SalesMetricsCards.js     # Total orders, completed, net sales, avg value
│   │   │   ├── HourlyRevenueChart.js    # Visual hourly revenue bar chart
│   │   │   ├── CollectionsMix.js        # Cash/UPI/Card breakdown & top items
│   │   │   ├── ShiftReconciliation.js   # Opening cash, cash in/out, register lock
│   │   │   ├── RecentOrdersTable.js     # Completed and recent orders list
│   │   │   └── AuditLogTable.js         # Audit log records (Admin/Manager)
│   │   │
│   │   ├── pos/                         # 🧾 Page: /pos (Point of Sale Terminal)
│   │   │   ├── index.js                 # Main POS Page component
│   │   │   ├── MenuFilterBar.js         # Search bar and category filter tabs
│   │   │   ├── MenuItemGrid.js          # Grid of menu item cards with stock status
│   │   │   ├── CartDrawer.js            # Active order list with quantities & notes
│   │   │   ├── OrderTypeSelector.js     # Dine-in vs Takeaway toggle + table picker
│   │   │   ├── DiscountCouponBar.js     # Percent/flat discounts & coupon codes
│   │   │   └── OrderSummaryFooter.js    # Server-quoted totals & submission buttons
│   │   │
│   │   ├── orders/                      # 📋 Page: /orders (Live Orders Queue)
│   │   │   ├── index.js                 # Main Live Orders Page component
│   │   │   ├── OrderHeaderFilters.js    # Search, type filter, and status tabs
│   │   │   ├── OrderKanbanBoard.js      # Multi-column workflow Kanban board
│   │   │   ├── OrderCard.js             # Order card with items and action buttons
│   │   │   └── RecordPaymentModal.js    # Cash/UPI/Card payment recording modal
│   │   │
│   │   ├── menu/                        # 🍴 Page: /menu (Menu Catalog & CRUD)
│   │   │   ├── index.js                 # Main Menu Catalog Page component
│   │   │   ├── MenuStatsCards.js        # Items total, available, out-of-stock count
│   │   │   ├── MenuFilterBar.js         # Catalog search and dropdown filters
│   │   │   ├── MenuTable.js             # Menu items table with stock status & actions
│   │   │   └── MenuItemModal.js         # Add / Edit item form modal with image upload
│   │   │
│   │   ├── kitchen/                     # 👨‍🍳 Page: /kitchen (Kitchen Display System)
│   │   │   ├── index.js                 # Main Kitchen Page component
│   │   │   ├── KitchenBoard.js          # Queued / Cooking / Ready ticket columns
│   │   │   └── KitchenTicketCard.js     # Ticket with item status controls & notes
│   │   │
│   │   └── login/                       # 🔐 Page: /login (Sign In)
│   │       ├── index.js                 # Main Login Page component
│   │       ├── LoginForm.js             # Sign-in email and password form
│   │       └── DemoAccountsBadge.js     # Quick-fill demo account buttons
│   │
│   └── shared/                          # 🌐 Reusable Cross-Page Components
│       ├── AuthProvider.js              # Auth context and toast notifications
│       ├── AppShell.js                  # Sidebar navigation, top header, user profile
│       ├── BillModal.js                 # Printable bill / receipt invoice modal
│       └── ui.js                        # StatusBadge, PayBadge, TypeBadge, Modal, Spinner
│
└── lib/
    └── api.js                           # API client, auth token storage, formatters
```

## Quick Start
```bash
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:5001/api
npm install
npm run dev                    # http://localhost:3000
npm run build && npm start     # production bundle
```

## Key Business Rules in Frontend
- **Server Quoting**: All totals shown in the POS come from `POST /orders/quote`; the client never computes prices or totals.
- **Role Permissions**: Menu editing is admin-only. Staff and Cashiers can place orders and record payments. Kitchen sees `/kitchen`.
- **Printable Invoices**: Bills use `window.print()` formatted for an 80mm thermal receipt.
