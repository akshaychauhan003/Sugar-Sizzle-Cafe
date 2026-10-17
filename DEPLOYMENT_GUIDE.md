# 🚀 End-to-End Live Deployment Guide: Next.js + Express + MongoDB Atlas

This step-by-step guide walks you through deploying the **Sugar & Sizzle (RestoFlow POS)** project completely free on cloud infrastructure:

* **Database**: **MongoDB Atlas** (M0 Free Sandbox Tier — 512 MB, Free Forever)
* **Backend API**: **Render** (Free Web Service for Express.js / Node.js)
* **Frontend Web App**: **Vercel** (Hobby Plan for Next.js 14, Free Forever)
* **Code Repository**: **GitHub** (Public or Private Monorepo)

---

## 📐 Architecture & Connection Flow

```text
┌────────────────────────┐                   ┌────────────────────────┐
│      User Browser      │                   │     MongoDB Atlas      │
│  (Desktop, Tablet, POS)│                   │   (M0 Free Cluster)    │
└───────────┬────────────┘                   └───────────▲────────────┘
            │                                            │
   HTTPS Requests                                Mongoose Connection
            │                                  (mongodb+srv:// URI)
            ▼                                            │
┌────────────────────────┐                   ┌───────────┴────────────┐
│      Vercel Host       │ ── API Requests ──►│      Render Host       │
│    Next.js Frontend    │   (CORS Enabled)  │   Express.js Backend   │
│ (https://*.vercel.app) │                   │(https://*.onrender.com)│
└────────────────────────┘                   └────────────────────────┘
```

---

## 📋 Overview Checklist

1. [Set Up Free Cloud Database on MongoDB Atlas](#step-1-free-cloud-database-setup-mongodb-atlas)
2. [Seed Initial Demo Data to MongoDB Atlas](#step-2-seed-demo-data-to-cloud-mongodb)
3. [Initialize Git and Push to GitHub](#step-3-push-project-to-github)
4. [Deploy Backend API on Render](#step-4-deploy-backend-api-on-render)
5. [Deploy Frontend POS on Vercel](#step-5-deploy-frontend-on-vercel)
6. [Link Frontend & Backend (Update CORS)](#step-6-link-frontend-and-backend-cors-setup)
7. [Verify Live System & Troubleshooting](#step-7-testing-verification--tips)

---

## Step 1: Free Cloud Database Setup (MongoDB Atlas)

### 1.1 Create an Account
1. Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Try Free** and register or sign in with Google/GitHub.

### 1.2 Create an M0 Free Cluster
1. On the Atlas dashboard, click **Create** (or **Build a Database**).
2. Choose the **M0 (Free)** tier:
   * **Provider**: AWS or GCP
   * **Region**: Choose a region close to your users or Render server (e.g. `N. Virginia (us-east-1)` or `Frankfurt (eu-central-1)` or `Mumbai (ap-south-1)`).
   * **Cluster Name**: `Cluster0` (or default).
3. Click **Create Deployment**.

### 1.3 Create Database User Credentials
1. In the **Security Quickstart** modal:
   * **Username**: `restoflow_user` (or any username)
   * **Password**: Create a strong alphanumeric password (e.g., `RestoFlow2026Pass!`).
     > ⚠️ **Important**: Avoid using special characters like `@`, `:`, `/`, `?`, `#` in your password because they require URL encoding in the connection URI. Plain letters and numbers are safest.
2. Click **Create User**.

### 1.4 Configure Network Access (Allow Render Connection)
Because Render's free tier assigns dynamic IP addresses that change on redeployments, you must allow connection from any IP:
1. Under **Where would you like to connect from?**, select **Cloud Environment** or navigate to **Network Access** in the left sidebar.
2. Click **Add IP Address**.
3. Click **Allow Access from Anywhere** (`0.0.0.0/0`).
4. Click **Confirm**.

### 1.5 Copy MongoDB Connection String
1. Go to **Database** (or **Clusters**) in the left sidebar.
2. Click the **Connect** button on your cluster.
3. Select **Drivers** (Driver: **Node.js**, Version: **6.7 or later**).
4. Copy the connection string. It looks like:
   ```text
   mongodb+srv://restoflow_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. **CRITICAL EDIT**: Specify the database name (`restoflow`) right before the `?`:
   ```text
   mongodb+srv://restoflow_user:YOUR_PASSWORD@cluster0.abcde.mongodb.net/restoflow?retryWrites=true&w=majority&appName=Cluster0
   ```
   *(Replace `YOUR_PASSWORD` with the real user password you created).*

---

## Step 2: Seed Demo Data to Cloud MongoDB

Before deploying the API, populate your cloud database with the initial demo data (Admin user, Staff accounts, Menu items, Tables, Shifts, and Coupons):

1. Open your terminal in the project's `server/` directory:
   ```bash
   cd /Users/akshaysinghchauhan/Documents/projects/restoflow-task1/server
   ```
2. Run the seed script pointing directly to your new MongoDB Atlas connection string:
   ```bash
   MONGODB_URI="mongodb+srv://restoflow_user:YOUR_PASSWORD@cluster0.abcde.mongodb.net/restoflow?retryWrites=true&w=majority&appName=Cluster0" SEED_ALLOW_PRODUCTION=true node src/scripts/seed.js
   ```
3. You will see:
   ```text
   Connected to DB.
   Clearing old collections...
   Created demo users:
     - Admin: admin@restoflow.test / Admin@12345
     - Staff: staff@restoflow.test / Staff@12345
     - Cashier: cashier@restoflow.test / Cashier@12345
     - Kitchen: kitchen@restoflow.test / Kitchen@12345
     - Manager: manager@restoflow.test / Manager@12345
   Seeded 12 menu items, 8 tables, 4 categories...
   Demo seed complete!
   ```

---

## Step 3: Push Project to GitHub

Make sure you do not commit secret `.env` files. The root `.gitignore` is already set up to exclude `.env`, `node_modules`, and local logs.

1. Open your terminal in the project root:
   ```bash
   cd /Users/akshaysinghchauhan/Documents/projects/restoflow-task1
   ```
2. Initialize git repository and make initial commit:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for live production deployment"
   ```
3. Create a new repository on GitHub:
   * Go to [github.com/new](https://github.com/new).
   * Name your repository (e.g. `sugar-and-sizzle-pos` or `restoflow-pos`).
   * Choose **Public** or **Private**.
   * Leave README and .gitignore unchecked (we already have them).
   * Click **Create repository**.
4. Link and push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
   git push -u origin main
   ```

---

## Step 4: Deploy Backend API on Render

Render will host the Node.js Express REST API for free.

### 4.1 Create Web Service
1. Go to [dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.
2. Click **New +** (top right) and select **Web Service**.
3. Choose **Build and deploy from a Git repository**.
4. Locate your repository from the list and click **Connect**.

### 4.2 Configure Service Settings
Fill in the following fields:

| Field | Value | Notes |
|---|---|---|
| **Name** | `restoflow-api` | Or any unique name you prefer |
| **Region** | Select closest to your MongoDB Atlas cluster | e.g. Oregon, Frankfurt, or Singapore |
| **Branch** | `main` | Default branch |
| **Root Directory** | `server` | ⚠️ **MANDATORY**: Express code is inside `server/` |
| **Runtime** | `Node` | Automatically detected |
| **Build Command** | `npm install` | Installs server dependencies |
| **Start Command** | `npm start` | Runs `node src/server.js` |
| **Instance Type** | `Free` | $0/month free tier |

### 4.3 Configure Environment Variables on Render
Scroll down to the **Environment Variables** section and click **Add Environment Variable** for each:

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Sets Node to production mode |
| `MONGODB_URI` | `mongodb+srv://restoflow_user:YOUR_PASSWORD@cluster0.abcde.mongodb.net/restoflow?retryWrites=true&w=majority&appName=Cluster0` | Your Atlas connection URI |
| `JWT_SECRET` | *(Generate a 64-char string)* | Run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `8h` | Token expiry duration |
| `CORS_ORIGINS` | `http://localhost:3000` | Temporary. We will append the Vercel URL in Step 6 |
| `DEFAULT_TAX_RATE` | `5` | Default tax percentage |
| `STAFF_MAX_DISCOUNT_PERCENT` | `10` | Staff discount ceiling |
| `REPORT_TZ_OFFSET_MINUTES` | `330` | Timezone offset (+05:30 IST = 330 mins) |
| `SEED_ALLOW_PRODUCTION` | `false` | Security guard against accidental re-seed |

### 4.4 Deploy & Verify Backend
1. Click **Deploy Web Service** at the bottom.
2. Render will build and start your application. It usually takes 2–3 minutes.
3. Once the log displays `RestoFlow API listening on :10000 (production)` and `MongoDB connected`, copy your public Render URL:
   ```text
   https://restoflow-api.onrender.com
   ```
4. Verify the backend health check in your browser:
   Visit: `https://restoflow-api.onrender.com/api/health`
   Expected response:
   ```json
   { "status": "ok", "db": "up", "uptime": 45.2 }
   ```
5. You can also view interactive Swagger docs at:
   `https://restoflow-api.onrender.com/api/docs`

---

## Step 5: Deploy Frontend on Vercel

Vercel will host the Next.js 14 frontend application for free.

### 5.1 Import Project
1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** -> **Project**.
3. Find your GitHub repository and click **Import**.

### 5.2 Configure Project Settings
In the **Configure Project** screen:

1. **Project Name**: `sugar-and-sizzle-pos` (or custom name).
2. **Framework Preset**: `Next.js` (detected automatically).
3. **Root Directory**:
   * Click **Edit** next to Root Directory.
   * Select `web` from the dropdown / file picker and click **Continue**.
   * ⚠️ **MANDATORY**: The Next.js frontend code is located inside the `web/` directory.

### 5.3 Configure Environment Variables on Vercel
Expand the **Environment Variables** panel and add:

| Key | Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://restoflow-api.onrender.com/api` | Render backend URL + `/api` (NO trailing slash) |
| `NEXT_PUBLIC_CURRENCY_SYMBOL` | `₹` | Currency symbol displayed throughout the POS |

> ⚠️ **Important**: Ensure `NEXT_PUBLIC_API_URL` contains `/api` at the end (e.g. `https://your-service.onrender.com/api`), not just the base domain.

### 5.4 Deploy
1. Click **Deploy**.
2. Vercel will install dependencies and compile the Next.js production build (`next build`).
3. After ~1 minute, you will see the congratulations screen with your live production URL:
   ```text
   https://sugar-and-sizzle-pos.vercel.app
   ```

---

## Step 6: Link Frontend and Backend (CORS Setup)

For the frontend to communicate with your backend, your Render API must allow cross-origin requests from your Vercel domain.

1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Click your Web Service (`restoflow-api`).
3. Click **Environment** in the left navigation.
4. Locate `CORS_ORIGINS` and click **Edit**.
5. Update `CORS_ORIGINS` to include your Vercel URL (comma-separated):
   ```text
   http://localhost:3000,https://sugar-and-sizzle-pos.vercel.app
   ```
   *(Replace `https://sugar-and-sizzle-pos.vercel.app` with your actual Vercel URL. Do not include a trailing slash!)*
6. Click **Save Changes**.
7. Render will automatically redeploy the service with the updated CORS policy in under 30 seconds.

---

## Step 7: Testing, Verification & Tips

### 7.1 Sign In to Your Live POS
1. Open your live Vercel URL in your browser: `https://sugar-and-sizzle-pos.vercel.app`.
2. Login with any of the seeded accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **👑 Admin** | `admin@restoflow.test` | `Admin@12345` | Menu CRUD, Reports, Settings, Refunds, Discounts |
| **🧾 Staff** | `staff@restoflow.test` | `Staff@12345` | POS register, Dine-in/Takeaway orders, Print receipts |
| **💵 Cashier** | `cashier@restoflow.test` | `Cashier@12345` | Payment processing, Shift reconciliation |
| **👨‍🍳 Kitchen** | `kitchen@restoflow.test` | `Kitchen@12345` | Kitchen Display System (KDS) live ticket statuses |
| **📋 Manager** | `manager@restoflow.test` | `Manager@12345` | Shift locking, approvals, order overrides |

### 7.2 Run Quick Functional Tests
* Place an order from the POS register.
* Switch to the Kitchen view (`/kitchen`) to see the order arrive in real time.
* Check Reports & Analytics (`/reports`) to verify MongoDB aggregations and sales graphs.

---

## 💡 Important Cloud Free-Tier Notes & Best Practices

### 1. Render Free-Tier Spin-Down ("Cold Start")
* **Behavior**: Render free web services automatically spin down (go to sleep) if they receive no incoming HTTP requests for **15 minutes**.
* **Cold Start Latency**: When someone visits the website after a period of inactivity, the first API request might take **40–60 seconds** while Render spins up the container. Once awake, response times are lightning-fast (< 100ms).
* **Free Solution (Keep-Alive Ping)**:
  You can set up a free uptime monitor (such as [cron-job.org](https://cron-job.org) or [uptimerobot.com](https://uptimerobot.com)) to send a `GET` request every 14 minutes to:
  `https://restoflow-api.onrender.com/api/health`
  This keeps your Render service warm 24/7 without paying anything.

### 2. Next.js Client-Side Environment Variables
* `NEXT_PUBLIC_*` environment variables in Next.js are inlined into the client JavaScript bundle **at build time**.
* If you ever change `NEXT_PUBLIC_API_URL` in Vercel settings, you must trigger a **Redeploy** on Vercel (**Deployments** -> Three dots -> **Redeploy**) for the change to take effect.

### 3. MongoDB Atlas 512 MB Free Tier
* The M0 cluster includes 512 MB of storage, which easily holds tens of thousands of café orders, audit logs, and menu records.
* Automated daily backups are maintained by Atlas for free.

---

## 🛠️ Common Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| **CORS Error**: `Access to fetch ... has been blocked by CORS policy` | Render's `CORS_ORIGINS` is missing the exact Vercel URL | Add `https://your-app.vercel.app` to `CORS_ORIGINS` in Render Environment settings (no trailing slash!). Save and let Render redeploy. |
| **404 Not Found** on API calls | `NEXT_PUBLIC_API_URL` is missing `/api` | Update `NEXT_PUBLIC_API_URL` in Vercel to `https://your-service.onrender.com/api` and click **Redeploy**. |
| **Startup Failed: MONGODB_URI is required** | Environment variable missing in Render | Check Render Environment tab to ensure `MONGODB_URI` is spelled correctly and contains your Atlas connection string. |
| **MongooseServerSelectionError / IP Whitelist** | Atlas Network Access not allowing Render | Go to MongoDB Atlas -> **Network Access** -> Ensure `0.0.0.0/0` (Allow Anywhere) is active. |
| **JWT_SECRET is required (min 32 chars)** | Secret string too short | Generate a 64-char hex key via `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and update Render. |
| **Login fails ("Invalid credentials")** | Database has not been seeded | Run the seed command from Step 2 with your Atlas URI to generate the demo accounts. |

---

🎉 **Congratulations! Your Sugar & Sizzle POS application is now live on the internet!**
