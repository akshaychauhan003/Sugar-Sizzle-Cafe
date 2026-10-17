# 🏛️ RestoFlow POS — System Architecture

RestoFlow is organized into three decoupled, industry-standard tiers: **Frontend**, **Backend**, and **Database**.

```
restoflow-task1/
├── frontend/                    # Next.js 14 Client POS & KDS Workstation
├── backend/                     # Node.js + Express REST API Engine
├── database/                    # MongoDB Schema, Docker & Seed System
├── docs/                        # Project & Deployment Documentation
└── scripts/                     # Automation & Runner Scripts
```

---

## 🖥️ 1. Frontend (`frontend/`)

Built with **Next.js 14 (App Router)** and **React 18**:
* **`app/`**: Next.js route hierarchy:
  * `/pos` — Point of Sale counter terminal with live search & cart drawer
  * `/orders` — Kanban board for active dine-in & takeaway order lifecycle
  * `/kitchen` — Kitchen Display System (KDS) with live station preparation tags
  * `/menu` — Menu Vault catalog management & real-time stock toggling
  * `/reports` — Daily sales analytics, hourly revenue curves, cash reconciliation
  * `/login` — Secure JWT credentials authentication
* **`components/pages/`**: Modular page-level UI components organized cleanly by route name
* **`components/shared/`**: Reusable widgets (`AppShell`, `BillModal`, `StockManager`, `ui.js`)
* **`lib/api.js`**: Centralized HTTP client, JWT token storage, error formatting

---

## ⚙️ 2. Backend (`backend/`)

Built with **Node.js**, **Express**, and **Mongoose**:
* **`src/app.js`**: Middleware stack (Helmet, CORS, Rate Limiting, JSON body parser, Morgan logger)
* **`src/server.js`**: HTTP listener (Default Port: 5001)
* **`src/routes/`**: Clean RESTful routers for `auth`, `orders`, `menu`, `kitchen`, `tables`, `shifts`, `reports`, `stocks`
* **`src/services/`**: Server-authoritative business logic (`billing.js`, `orderStatus.js`, `shiftService.js`)
* **`src/models/`**: 14 Mongoose schemas with strict validations & index constraints
* **`api/index.js`**: Serverless handler adapter for one-click Vercel deployment
* **`tests/`**: Comprehensive unit and integration test suites with Jest & Supertest

---

## 🗄️ 3. Database (`database/`)

Built around **MongoDB 7.0**:
* **`seeds/seed.js`**: Master database seeding engine
* **`seeds/demoData.js`**: High-quality initial data fixtures
* **`init/01-init-mongo.js`**: Container startup indexing and collection initialization
* **`docker-compose.yml`**: Docker service for local MongoDB + Mongo Express UI
* **`README.md`**: Schema relationships, indexing guide, and MongoDB Atlas instructions

---

## 🔄 Data Flow

```
[POS Client / Kitchen KDS]
         │
         │ HTTPS / JSON (JWT Authorization: Bearer <token>)
         ▼
[Express REST API (:5001)]
    │    │
    │    ├── [Security & Validation: Helmet, CORS, Zod]
    │    ├── [Business Engine: Billing, Integer-Cent Math, Status State Machine]
    │    └── [Mongoose ODM Layer]
    │
    ▼
[MongoDB Database] (Local Port 27017 or MongoDB Atlas Cloud)
```
