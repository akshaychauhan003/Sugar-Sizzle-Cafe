# 🗄️ Database Architecture & Schema Reference

RestoFlow uses **MongoDB** as its primary persistent document store, managed by **Mongoose ODM** on the backend.

---

## 📂 Directory Structure

```
database/
├── docker-compose.yml       # Local MongoDB 7.0 + Mongo Express web admin UI
├── init/
│   └── 01-init-mongo.js     # Container startup script (creates collections & indexes)
├── seeds/
│   ├── demoData.js          # Raw data fixtures (Users, Menu items, Coupons, Tables)
│   └── seed.js              # Master database seeding script (resets & populates data)
└── README.md                # Schema reference & operational commands
```

---

## ⚡ Quick Operational Commands

### 1. Seed or Reset Database
From repository root:
```bash
npm run seed                 # Calls backend seed runner
# or
npm run seed:database        # Direct seed runner from database/
```

### 2. Run Local MongoDB with Docker (Optional)
If you don't have MongoDB installed locally via Homebrew:
```bash
cd database
docker compose up -d
```
* **MongoDB Port**: `mongodb://localhost:27017/restoflow`
* **Mongo Express Web UI**: [http://localhost:8081](http://localhost:8081)

---

## 📊 Core Collections & Schemas

| Collection | Model Path | Purpose | Key Indexes |
|---|---|---|---|
| `users` | `backend/src/models/User.js` | User authentication, staff roles, bcrypt passwords | `email` (unique), `role` |
| `categories` | `backend/src/models/Category.js` | Menu category groupings (Pizzas, Beverages, etc.) | `name` |
| `menuitems` | `backend/src/models/MenuItem.js` | Menu items, pricing, prep times, inventory links | `sku` (unique), `category` |
| `stocks` | `backend/src/models/Stock.js` | Raw inventory, batches, shelf life & expiry tracking | `itemName`, `batchNumber`, `status` |
| `tables` | `backend/src/models/Table.js` | Dining tables, sections (Indoor/Patio), current order | `code` (unique), `status` |
| `orders` | `backend/src/models/Order.js` | Order lifecycle, line items, status state machine | `orderNumber` (unique), `status`, `createdAt` |
| `kitchentickets` | `backend/src/models/KitchenTicket.js` | Live KDS kitchen line items and preparation statuses | `ticketNumber` (unique), `order`, `status` |
| `payments` | `backend/src/models/Payment.js` | Cash/UPI/Card payment transaction records | `paymentRef` (unique), `order` |
| `invoices` | `backend/src/models/Invoice.js` | Permanent order bill snapshots for receipt reprint | `invoiceNumber` (unique), `order` (unique) |
| `shifts` | `backend/src/models/Shift.js` | Cash register drawer sessions & reconciliation | `shiftNumber` (unique), `status` |
| `coupons` | `backend/src/models/Coupon.js` | Promotional discounts (`WELCOME10`, `FLAT50`) | `code` (unique), `isActive` |
| `settings` | `backend/src/models/Setting.js` | System config (tax rates, business details) | `key` (unique) |
| `auditlogs` | `backend/src/models/AuditLog.js` | Immutable administrative audit trail | `user`, `createdAt` |
| `counters` | `backend/src/models/Counter.js` | Atomic sequential counters for numbers (ORD, KT, INV) | `_id` |

---

## 🌐 Connecting to MongoDB Atlas (Production & Free Cloud)

In `backend/.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/restoflow?retryWrites=true&w=majority
```
*(Ensure network access in Atlas allows `0.0.0.0/0` if deploying to serverless platforms like Vercel or Render).*
