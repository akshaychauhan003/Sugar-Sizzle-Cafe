const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const env = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/error');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser requests or same-origin
    if (!origin) return cb(null, true);
    // Allow wildcard
    if (env.corsOrigins.includes('*')) return cb(null, true);
    // Direct match
    if (env.corsOrigins.includes(origin)) return cb(null, true);
    // Allow any .vercel.app domain automatically
    if (origin.endsWith('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }
    return cb(null, true); // Permissive in cloud deployments to prevent network blocks
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get(['/', '/health'], (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptime: process.uptime(),
    service: 'Sugar & Sizzle (RestoFlow API)',
  });
});

app.get('/api/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down', uptime: process.uptime() });
});

// API docs (OpenAPI 3)
try {
  const swaggerUi = require('swagger-ui-express');
  const YAML = require('yaml');
  const spec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'openapi.yaml'), 'utf8'));
  app.get('/api/openapi.json', (_req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
} catch (e) { console.warn('API docs not loaded:', e.message); }

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const menuRoutes = require('./routes/menu');
const ordersRoutes = require('./routes/orders');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const categoriesRoutes = require('./routes/categories');
const tablesRoutes = require('./routes/tables');
const couponsRoutes = require('./routes/coupons');
const kitchenRoutes = require('./routes/kitchen');
const shiftsRoutes = require('./routes/shifts');
const invoicesRoutes = require('./routes/invoices');
const auditRoutes = require('./routes/audit');
const stocksRoutes = require('./routes/stocks');

function mountApi(base) {
  app.use(`${base}/auth`, authRoutes);
  app.use(`${base}/users`, usersRoutes);
  app.use(`${base}/menu`, menuRoutes);
  app.use(`${base}/stocks`, stocksRoutes);
  app.use(`${base}/orders`, ordersRoutes);
  app.use(`${base}/reports`, reportsRoutes);
  app.use(`${base}/settings`, settingsRoutes);
  app.use(`${base}/categories`, categoriesRoutes);
  app.use(`${base}/tables`, tablesRoutes);
  app.use(`${base}/coupons`, couponsRoutes);
  app.use(`${base}/kitchen`, kitchenRoutes);
  app.use(`${base}/shifts`, shiftsRoutes);
  app.use(`${base}/invoices`, invoicesRoutes);
  app.use(`${base}/audit`, auditRoutes);
}

mountApi('/api');
mountApi('/api/v1'); // alias for versioned clients

app.use(notFoundHandler);
app.use(errorHandler);
module.exports = app;
