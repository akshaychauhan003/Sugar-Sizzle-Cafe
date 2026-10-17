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
2. Initialize environment files (`backend/.env` with `PORT=5001` and `frontend/.env.local`).
3. Install all dependencies for both backend and frontend.
4. Seed the database with demo users, café menu items, vibe tables, active shifts, and 38 orders.
5. Execute the test suite (57 unit and integration tests).

---

## 🚀 Running the Project

```bash
# Start both Backend API (:5001) and Next.js Frontend POS (:3000) simultaneously
npm run dev
```

* **Frontend POS & Workstation**: [http://localhost:3000](http://localhost:3000)
* **Backend API Health**: [http://localhost:5001/api/health](http://localhost:5001/api/health)
* **Interactive API Documentation**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)

### Dedicated Service Commands

| Command | Action |
|---|---|
| `npm run dev` | Launch both backend API and frontend POS concurrently |
| `npm run dev:backend` | Start backend API only (`localhost:5001`) |
| `npm run dev:frontend` | Start frontend Next.js dev server only (`localhost:3000`) |
| `npm run seed` | Re-seed database with demo users, catalog, shifts & orders |
| `npm run seed:database` | Direct execution of database seed script from `database/` |
| `npm test` | Run complete backend test suite (unit + integration, 57 tests) |
| `npm run build` | Validate & compile Next.js production build bundle |
| `npm run lint` | Run code quality checks across frontend and backend |

---

## 🔑 Demo Staff & Admin Accounts

| Role | User ID / Login | Email | Password | Permissions |
|---|---|---|---|---|
| **👑 Admin** | `admin` | `admin@sugarsizzle.com` | `Admin@123` | Full menu CRUD, all discounts, audit log, reports, users |
| **💵 Cashier** | `cashier` | `cashier@sugarsizzle.com` | `Cashier@123` | POS drinks register, orders, payments, shift reconciliation |
| **👨‍🍳 Chef / Barista** | `chef` | `chef@sugarsizzle.com` | `Chef@123` | Kitchen Display System (KDS), drink prep & stock expiry |
| **🧾 Waitstaff** | `staff` | `staff@sugarsizzle.com` | `Staff@123` | Table delivery queue, confirm customer departure & table turnover |
| **📋 Manager** | `manager` | `manager@sugarsizzle.com` | `Manager@123` | Shift locking, cancellations, discount approvals |

* **Secret Promo Coupons**: `WELCOME10` (10% off), `FLAT50` (flat ₹50 off).

---

## 📁 Professional Project Architecture

```
restoflow-task1/
├── frontend/                    # Next.js 14 Client POS & KDS Workstation
│   ├── app/                     # Next.js App Router (POS, orders, kitchen, menu, reports)
│   ├── components/              # Modular UI components
│   │   ├── pages/               # Page-specific components (pos, orders, kitchen, menu, dashboard)
│   │   └── shared/              # Reusable shared components (AppShell, BillModal, ui)
│   ├── lib/                     # API client, token store, currency formatters
│   └── public/                  # Favicons, PWA icons, manifest & brand assets
│
├── backend/                     # Node.js + Express REST API Engine
│   ├── api/                     # Vercel serverless function entrypoint
│   ├── docs/                    # OpenAPI 3.0 YAML spec & Postman collection
│   ├── src/
│   │   ├── config/              # Environment & application configuration
│   │   ├── db/                  # MongoDB connection management
│   │   ├── middleware/          # JWT Auth, error handler, Zod validator
│   │   ├── models/              # 14 Mongoose data schemas (Order, Menu, Stock, Shift, etc.)
│   │   ├── routes/              # Express API routers (orders, menu, kitchen, shifts, reports)
│   │   └── services/            # Business logic (billing, order state engine, tableService)
│   └── tests/                   # 57 unit and integration tests (Jest + Supertest)
│
├── database/                    # MongoDB Schemas, Seeds, Docker & Migration
│   ├── seeds/
│   │   ├── demoData.js          # Raw data fixtures (Users, Menu items, Coupons, Tables)
│   │   └── seed.js              # Master database seeding script
│   ├── init/
│   │   └── 01-init-mongo.js     # Mongo shell initialization script (collections & indexes)
│   ├── docker-compose.yml       # Local MongoDB 7.0 + Mongo Express web admin UI
│   └── README.md                # Detailed schema documentation & operational guide
│
├── docs/                        # Project Documentation
│   ├── DEPLOYMENT_GUIDE.md      # Full live deployment guide (Vercel, Render, MongoDB Atlas)
│   ├── ARCHITECTURE.md          # Multi-tier system architecture overview
│   └── API_SPECIFICATION.md     # OpenAPI & Postman specifications
│
├── scripts/                     # Automation & DevOps Scripts
│   ├── setup.sh                 # Complete automated environment setup script
│   └── start.sh                 # Dual-service concurrent runner with graceful port release
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
