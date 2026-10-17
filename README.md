# 🍯🔥 Sugar & Sizzle — Hot Honey & Chili Co.
### High-Speed Artisan Café POS & Order Management System

A production-grade, tactile web-based POS and kitchen workstation built with **Next.js 14**, **Node.js + Express**, and **MongoDB**. Designed with a spicy & sweet Gen-Z aesthetic, warm coffee/cream tones, and server-authoritative billing and state machines.

---

## ⚡ Instant One-Click Setup

Ensure **Node.js (>= 18)** and **MongoDB** (local or Atlas) are available on your system.

```bash
# 1. Run the automated setup script
npm run setup
```

This single command will:
1. Verify Node.js and local MongoDB Community service.
2. Initialize environment files (`server/.env` with `PORT=5001` and `web/.env.local`).
3. Install all dependencies for both backend and frontend.
4. Seed the database with demo users, café menu items, vibe tables, active shifts, and 38 orders.
5. Execute the test suite (42 unit and integration tests).

---

## 🚀 Running the Project

```bash
# Start both Backend API (:5001) and Next.js Web POS (:3000) simultaneously
npm run dev
```

* **Web POS & Workstation**: [http://localhost:3000](http://localhost:3000)
* **Backend API Health**: [http://localhost:5001/api/health](http://localhost:5001/api/health)
* **Interactive API Documentation**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)

### Dedicated Service Commands

| Command | Action |
|---|---|
| `npm run dev` | Launch both backend API and frontend POS concurrently |
| `npm run dev:server` | Start backend API only (`localhost:5001`) |
| `npm run dev:web` | Start frontend Next.js dev server only (`localhost:3000`) |
| `npm run seed` | Re-seed database with demo users, catalog, shifts & orders |
| `npm test` | Run complete backend test suite (unit + integration) |
| `npm run build` | Validate & compile Next.js production build bundle |

---

## 🔑 Demo Staff & Admin Accounts

| Role | Email | Password | Permissions |
|---|---|---|---|
| **👑 Admin** | `admin@restoflow.test` | `Admin@12345` | Full menu CRUD, all discounts, audit log, reports, refunds |
| **🧾 Staff** | `staff@restoflow.test` | `Staff@12345` | POS register, take orders, settle bills, print receipts |
| **💵 Cashier** | `cashier@restoflow.test` | `Cashier@12345` | POS register, payments, shift reconciliation |
| **👨‍🍳 Kitchen** | `kitchen@restoflow.test` | `Kitchen@12345` | Kitchen Display System (KDS) & line prep statuses |
| **📋 Manager** | `manager@restoflow.test` | `Manager@12345` | Shift locking, cancellations, discount approvals |

* **Secret Promo Coupons**: `WELCOME10` (10% off), `FLAT50` (flat ₹50 off).

---

## 📁 Page-Based Project Architecture

```
restoflow-task1/
├── server/                      # Node.js + Express + MongoDB REST API
│   ├── src/
│   │   ├── models/              # Order, MenuItem, Table, Shift, Payment, User, Counter
│   │   ├── routes/              # orders, menu, tables, kitchen, shifts, reports, auth
│   │   ├── services/            # orderService, billing, orderStatus, tableService, kitchenService
│   │   └── server.js            # Express entrypoint (Port 5001)
│   └── tests/                   # 42 unit and integration tests (Jest + Supertest)
│
├── web/                         # Next.js 14 Web POS Application
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── page.js          # Direct POS Register (/)
│   │   │   ├── pos/page.js      # Direct POS Register (/pos)
│   │   │   ├── orders/page.js   # Live Order Stream (/orders)
│   │   │   ├── kitchen/page.js  # Kitchen Display System (/kitchen)
│   │   │   ├── menu/page.js     # The Menu Vault (/menu)
│   │   │   └── reports/page.js  # Daily Sales & Shifts (/reports)
│   │   ├── login/page.js        # Terminal Sign In (/login)
│   │   ├── globals.css          # Sugar & Sizzle color & aesthetic token system
│   │   └── layout.js           # Google Fonts (Plus Jakarta Sans + Outfit)
│   └── components/
│       ├── pages/
│       │   ├── pos/             # MenuFilterBar, MenuItemGrid, CartDrawer, OrderTypeSelector, OrderSummaryFooter
│       │   ├── orders/          # OrderKanbanBoard, OrderCard, OrderHeaderFilters, RecordPaymentModal
│       │   ├── kitchen/         # KitchenBoard, KitchenTicketCard
│       │   ├── menu/            # MenuTable, MenuItemModal, MenuFilterBar, MenuStatsCards
│       │   ├── dashboard/       # SalesMetricsCards, HourlyRevenueChart, CollectionsMix, ShiftReconciliation
│       │   └── login/           # LoginForm, DemoAccountsBadge
│       └── shared/              # AppShell, AuthProvider, BillModal, ui
│
├── scripts/
│   ├── setup.sh                 # Complete automated environment setup script
│   └── start.sh                 # Dual-service concurrent runner with graceful shutdown
└── package.json                 # Monorepo management scripts
```

---

## 🔒 Key Business & Technical Guarantees

1. **Order Confirmation Immutability**:
   * Once an order is confirmed (`pending` $\rightarrow$ `preparing`), neither staff nor any API client can confirm the same order again.
   * Atomically enforced via MongoDB conditional queries and returns `409 Conflict` (`ORDER_ALREADY_CONFIRMED`).
2. **Server-Authoritative Integer Billing**:
   * Client-sent prices and totals are completely ignored.
   * Subtotals, 5% café tax, coupon logic, and balance due are computed using integer minor units (cents/paise) to prevent floating-point rounding errors.
3. **Idempotency Protection**:
   * All order creations and payment recordings accept unique `Idempotency-Key` headers to prevent double-charges and duplicate orders.
4. **Table Collision Prevention**:
   * Dine-in tables verify availability atomically before order creation, and roll back if conflicts occur.
