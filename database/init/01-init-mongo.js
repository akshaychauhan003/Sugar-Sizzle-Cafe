/**
 * MongoDB Initializer Script for mongosh / Docker container initialization.
 * Automatically run on fresh container startup in /docker-entrypoint-initdb.d/
 */

db = db.getSiblingDB('restoflow');

print('🚀 Initializing MongoDB for RestoFlow POS...');

// 1. Create collections with explicit schemas / validators if needed
const collections = [
  'users',
  'categories',
  'menuitems',
  'stocks',
  'tables',
  'orders',
  'kitchentickets',
  'payments',
  'invoices',
  'shifts',
  'coupons',
  'settings',
  'auditlogs',
  'counters'
];

collections.forEach((col) => {
  if (!db.getCollectionNames().includes(col)) {
    db.createCollection(col);
    print(`   ✅ Created collection: ${col}`);
  }
});

// 2. Setup critical unique and performance indexes
print('⚡ Applying high-performance database indexes...');

// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Menu Items
db.menuitems.createIndex({ sku: 1 }, { unique: true });
db.menuitems.createIndex({ category: 1, isAvailable: 1 });

// Stocks
db.stocks.createIndex({ itemName: 1 });
db.stocks.createIndex({ batchNumber: 1 });
db.stocks.createIndex({ status: 1 });

// Tables
db.tables.createIndex({ code: 1 }, { unique: true });
db.tables.createIndex({ status: 1 });

// Orders
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });
db.orders.createIndex({ tableNumber: 1 });

// Kitchen Tickets
db.kitchentickets.createIndex({ ticketNumber: 1 }, { unique: true });
db.kitchentickets.createIndex({ status: 1 });
db.kitchentickets.createIndex({ order: 1 });

// Payments
db.payments.createIndex({ paymentRef: 1 }, { unique: true });
db.payments.createIndex({ order: 1 });
db.payments.createIndex({ method: 1 });

// Invoices
db.invoices.createIndex({ invoiceNumber: 1 }, { unique: true });
db.invoices.createIndex({ order: 1 }, { unique: true });

// Shifts
db.shifts.createIndex({ shiftNumber: 1 }, { unique: true });
db.shifts.createIndex({ status: 1 });

// Coupons
db.coupons.createIndex({ code: 1 }, { unique: true });
db.coupons.createIndex({ isActive: 1 });

// Counters
db.counters.createIndex({ _id: 1 });

print('🎉 RestoFlow MongoDB initialization and indexing completed successfully.');
