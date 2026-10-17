# 🔌 REST API Specification & Documentation

The RestoFlow backend provides a complete RESTful API built on Express and MongoDB.

---

## 🌐 Interactive Documentation

When the backend is running (`npm run dev` or `npm run dev:backend`), you can inspect and test all endpoints interactively:

* **Interactive Swagger UI**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)
* **API Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)
* **OpenAPI 3.0 YAML Spec**: Located at `backend/docs/openapi.yaml`
* **Postman Collection**: Located at `backend/docs/RestoFlow.postman_collection.json`

---

## 🔐 Authentication

All protected endpoints require an `Authorization` header with a Bearer JWT:
```http
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained by logging in via `POST /api/auth/login`.

---

## 📋 Endpoint Overview

### Authentication (`/api/auth`)
* `POST /api/auth/login` — Sign in with email and password
* `GET /api/auth/me` — Retrieve current authenticated staff profile

### Menu Management (`/api/menu`)
* `GET /api/menu` — List available catalog items (supports `category`, `search`, pagination)
* `POST /api/menu` — Create menu item *(Admin only)*
* `PUT /api/menu/:id` — Update menu item *(Admin only)*
* `PATCH /api/menu/:id/toggle` — Quick toggle 86 item availability *(Staff/Cashier/Kitchen)*
* `DELETE /api/menu/:id` — Deactivate menu item *(Admin only)*

### Categories (`/api/categories`)
* `GET /api/categories` — List all active categories
* `POST /api/categories` — Create category *(Admin only)*

### Orders & Billing (`/api/orders`)
* `GET /api/orders` — List live orders (filter by `status`, `type`, date range)
* `POST /api/orders` — Create new order (dine-in or takeaway)
* `POST /api/orders/quote` — Compute server-authoritative price quote with taxes & discounts
* `GET /api/orders/:id` — Get full order details & bill breakdown
* `PATCH /api/orders/:id/status` — Advance state machine (`pending` -> `preparing` -> `ready` -> `completed`)
* `POST /api/orders/:id/cancel` — Cancel order *(Pending only, or Admin/Manager override)*
* `POST /api/orders/:id/payments` — Record cash, card, or UPI transaction

### Kitchen Display System (`/api/kitchen`)
* `GET /api/kitchen/tickets` — Live active orders queued for chef preparation
* `PATCH /api/kitchen/tickets/:id/items/:itemId` — Mark specific dish as preparing or cooked

### Tables (`/api/tables`)
* `GET /api/tables` — List restaurant tables with status (`available`, `occupied`, `reserved`)
* `POST /api/tables` — Create dining table *(Admin only)*

### Shifts & Cash Drawer (`/api/shifts`)
* `GET /api/shifts/current` — Current active register shift session
* `POST /api/shifts/open` — Open shift with starting cash float
* `POST /api/shifts/close` — Reconcile payments and lock cash drawer

### Reports & Analytics (`/api/reports`)
* `GET /api/reports/daily` — Daily sales summary, payment mix, and hourly revenue breakdown
* `GET /api/reports/export/csv` — Export sales history to CSV

### Stock & Inventory (`/api/stocks`)
* `GET /api/stocks` — List raw inventory items with expiry dates and low-stock alerts
* `POST /api/stocks` — Add new stock batch
* `PUT /api/stocks/:id` — Update stock quantities
