# RestoFlow POS — Backend API (Express + MongoDB)

Express + MongoDB (Mongoose) + JWT REST API for restaurant menu, orders, billing, payments and daily sales.
Frontend (Next.js) lives in `../frontend`. **Live URL:** _to be added after deployment_.

## Features
- JWT auth, roles `admin`, `shift_manager`, `cashier`, `kitchen`, plus legacy `staff` (cashier-equivalent), login rate limiting, bcrypt hashing
- Menu: create / view / edit / deactivate (soft delete), search, category + availability filters, pagination
- Orders: dine-in / takeaway, multiple items, edit while pending, unique order numbers (`ORD-YYYYMMDD-0001`)
- Billing (server-authoritative, integer-cent math): subtotal -> discount -> configurable tax -> total
- Workflow: `pending -> preparing -> ready -> completed` (+ `cancelled`), enforced by a state machine with compare-and-set updates and a status history
- Payments: cash / UPI / card **recorded only (no gateway)**, partial payments, overpayment and duplicate protection (`Idempotency-Key`)
- Daily sales report: counts, net sales, collections by method, hourly, top items, recent orders
- Items are snapshotted into orders, so later menu edits never change history

## Business rules (decisions)
| Rule | Behaviour |
|---|---|
| Totals | Client prices/totals are ignored (stripped by validation); recomputed from DB prices |
| Tax | Exclusive, added **after** discount. Rate stored in Settings (`PUT /api/settings/tax`, admin); falls back to `DEFAULT_TAX_RATE` |
| Discounts | `percent` or `flat`, capped at subtotal. Staff limited to `STAFF_MAX_DISCOUNT_PERCENT` (default 10%), admin unlimited |
| Unavailable items | Inactive or `isAvailable=false` items are rejected with `ITEM_UNAVAILABLE` |
| Complete | Order must be fully paid first (`PAYMENT_REQUIRED`) |
| Cancel | Cashier/staff: pending only. Admin / shift manager: any non-completed unpaid order. Orders with payments cannot be cancelled (refunds not implemented) |
| Roles | Menu create/edit/delete, users, tax = admin. Kitchen may mark preparing → ready. Staff/cashier may toggle availability (86 an item) |
| Net sales (report) | Sum of `total` of non-cancelled, **fully paid** orders created that day, in the `REPORT_TZ_OFFSET_MINUTES` timezone (default IST) |

## Setup
Requires Node >= 18 and MongoDB (local or Atlas free tier).
```bash
cd backend
cp .env.example .env      # set MONGODB_URI and a long JWT_SECRET
npm install
npm run seed              # demo users, menu, 3 days of sample orders
npm run dev               # http://localhost:5001 (set PORT=5001 in .env if on macOS)
```
Docs: `http://localhost:5001/api/docs` (Swagger UI, spec in `docs/openapi.yaml`) and a Postman collection in `docs/RestoFlow.postman_collection.json` (run the folders in order; login saves tokens). Health: `GET /api/health`.

### Environment variables
See `.env.example`: `NODE_ENV, PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGINS, DEFAULT_TAX_RATE, STAFF_MAX_DISCOUNT_PERCENT, REPORT_TZ_OFFSET_MINUTES, SEED_ALLOW_PRODUCTION`.

### Demo accounts (development/test data only)
| Role | User ID / Username | Email | Password |
|---|---|---|---|
| Admin | admin | admin@sugarsizzle.com | Admin@123 |
| Cashier | cashier | cashier@sugarsizzle.com | Cashier@123 |
| Chef / Barista | chef | chef@sugarsizzle.com | Chef@123 |
| Staff (Waitstaff) | staff | staff@sugarsizzle.com | Staff@123 |
| Shift Manager | manager | manager@sugarsizzle.com | Manager@123 |

`npm run seed` wipes the database and refuses to run in production unless `SEED_ALLOW_PRODUCTION=true`.

## Tests
```bash
npm run test:unit        # billing, status machine, validation, dates, HTTP guards - no DB needed
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/restoflow_test npm test   # adds DB integration suite (drops that DB!)
```

## API summary
Same routes are also mounted under `/api/v1`. Errors: `{ "error": { "code", "message", "details?" } }`. Lists: `{ data, meta }`.

- Auth: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- Users: `GET|POST /users`, `PATCH /users/:id` (admin, includes branch assignment)
- Menu: `GET|POST /menu`, `GET /menu/categories`, `GET /menu/export.csv`, `GET|PUT|DELETE /menu/:id`, `PATCH /menu/:id/availability`, `PATCH /menu/:id/stock-status`, `POST /menu/:id/image`
- Categories / tables / coupons: `/categories`, `/tables`, `/coupons` (+ `POST /coupons/validate`)
- Orders: `POST /orders/quote`, `POST|GET /orders`, `GET|PATCH /orders/:id`, `PATCH /orders/:id/status`, `POST /orders/:id/payment`, `GET /orders/:id/history`, `GET /orders/:id/payments`, `POST /orders/:id/refund`
- Kitchen: `GET /kitchen/tickets`, `PATCH /kitchen/tickets/:id/items`, `PATCH /kitchen/tickets/:id/notes`, `POST /kitchen/tickets/:id/ready`
- Invoices: `GET /invoices/by-order/:orderId`, `POST /invoices/:id/reprint`
- Shifts: `POST /shifts/start`, `GET /shifts`, `GET /shifts/active`, `GET /shifts/history`, `GET /shifts/:id`, `POST /shifts/:id/cash-movement`, `POST /shifts/:id/reconcile`, `POST /shifts/:id/lock`
- Reports: `GET /reports/daily-sales` (supports `date` or `startDate` & `endDate` range), `GET /reports/summary`, `GET /reports/payment-breakdown`, `GET /reports/dine-in-vs-takeaway`, `GET /reports/completed`, `GET /reports/audit`, `GET /reports/export.csv`
- Settings: `GET|PUT /settings/tax`

## Deployment (Render / Railway + MongoDB Atlas)
Root dir `server`, build `npm install`, start `npm start`; set env vars above (`CORS_ORIGINS` = your Vercel URL). Allow the host's IPs in Atlas Network Access, then run `npm run seed` once from your machine against the Atlas URI.
