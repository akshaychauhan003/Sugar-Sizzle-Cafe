/**
 * Master Database Seed Script — Sugar & Sizzle (RestoFlow POS)
 * Resets collections and seeds sample data:
 * - Admin, Staff, Shift Manager, Cashier, Kitchen accounts
 * - Categories & Menu Items with ingredient stock links
 * - Stock inventory with shelf-life and batch tracking
 * - 12 cafe tables across Indoor Main and Outdoor Patio
 * - Discount coupons (WELCOME10, FLAT50)
 * - 3 days of realistic orders, kitchen tickets, invoices, and shift audits
 */
const path = require('path');

// Ensure modules can be resolved from backend/node_modules
const backendNodeModules = path.resolve(__dirname, '../../backend/node_modules');
if (!module.paths.includes(backendNodeModules)) {
  module.paths.push(backendNodeModules);
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables from backend/.env if available
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

const env = require('../../backend/src/config/env');
const User = require('../../backend/src/models/User');
const MenuItem = require('../../backend/src/models/MenuItem');
const Order = require('../../backend/src/models/Order');
const Setting = require('../../backend/src/models/Setting');
const Counter = require('../../backend/src/models/Counter');
const Category = require('../../backend/src/models/Category');
const Table = require('../../backend/src/models/Table');
const Coupon = require('../../backend/src/models/Coupon');
const KitchenTicket = require('../../backend/src/models/KitchenTicket');
const Payment = require('../../backend/src/models/Payment');
const Invoice = require('../../backend/src/models/Invoice');
const Shift = require('../../backend/src/models/Shift');
const AuditLog = require('../../backend/src/models/AuditLog');
const Stock = require('../../backend/src/models/Stock');
const { computeBill } = require('../../backend/src/services/billing');
const { todayStr } = require('../../backend/src/lib/dates');
const { DEMO_USERS, MENU, COUPONS } = require('./demoData');

async function runSeed() {
  if (env.isProd && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    console.error('❌ Refusing to seed in production (set SEED_ALLOW_PRODUCTION=true to override).');
    process.exit(1);
  }

  env.validate();
  const mongoUri = env.mongoUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restoflow';
  console.log(`🌱 Connecting to database at: ${mongoUri.replace(/:\/\/[^:]+:[^@]+@/, '://<credentials>@')}`);
  await mongoose.connect(mongoUri);

  console.log('🧹 Purging existing collections...');
  await Promise.all([
    User.deleteMany({}),
    MenuItem.deleteMany({}),
    Order.deleteMany({}),
    Counter.deleteMany({}),
    Setting.deleteMany({}),
    Category.deleteMany({}),
    Table.deleteMany({}),
    Coupon.deleteMany({}),
    KitchenTicket.deleteMany({}),
    Payment.deleteMany({}),
    Invoice.deleteMany({}),
    Shift.deleteMany({}),
    AuditLog.deleteMany({}),
    Stock.deleteMany({}),
  ]);

  console.log('👤 Seeding demo users...');
  const users = [];
  for (const u of DEMO_USERS) {
    users.push(await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      roles: u.roles || [u.role],
      passwordHash: await bcrypt.hash(u.password, 10),
    }));
  }
  const byRole = Object.fromEntries(users.map((u) => [u.role, u]));

  console.log('🏷️  Seeding menu categories...');
  const categoryNames = [...new Set(MENU.map((m) => m[2]))];
  const categories = await Category.insertMany(categoryNames.map((name, i) => ({
    name,
    description: `${name} menu section`,
    displayOrder: i + 1,
    isActive: true,
  })));
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  const now = new Date();
  const inDays = (d) => new Date(now.getTime() + d * 86400000);

  console.log('📦 Seeding stock inventory...');
  const stockDocs = await Stock.insertMany([
    {
      itemName: 'Buffalo Mozzarella Cheese', category: 'Dairy', quantity: 12, unit: 'kg', costPrice: 420,
      batchNumber: 'STK-2026-001', supplier: 'Artisan Valley Farms', purchaseDate: inDays(-5), expiryDate: inDays(3),
      status: 'in_stock', minimumQuantity: 5, notes: 'Fresh Italian buffalo mozzarella for Neapolitan pizzas', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Heavy Dairy Cream', category: 'Dairy', quantity: 4, unit: 'L', costPrice: 180,
      batchNumber: 'STK-2026-002', supplier: 'Highland Pure Dairies', purchaseDate: inDays(-4), expiryDate: inDays(2),
      status: 'low_stock', minimumQuantity: 6, notes: 'Dessert preparation & sauce reduction', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Prime Wagyu Ground Chuck', category: 'Meat & Seafood', quantity: 24, unit: 'kg', costPrice: 1200,
      batchNumber: 'STK-2026-003', supplier: 'Miyazaki Meats Co.', purchaseDate: inDays(-2), expiryDate: inDays(5),
      status: 'in_stock', minimumQuantity: 8, notes: 'For signature Wagyu burgers', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Single-Origin Ethiopian Yirgacheffe Beans', category: 'Coffee & Tea', quantity: 45, unit: 'kg', costPrice: 650,
      batchNumber: 'STK-2026-004', supplier: 'Equator Coffee Roasters', purchaseDate: inDays(-10), expiryDate: inDays(50),
      status: 'in_stock', minimumQuantity: 10, notes: 'Light floral roast for cold brew & espresso', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Artisan Brioche Burger Buns', category: 'Bakery', quantity: 48, unit: 'units', costPrice: 22,
      batchNumber: 'STK-2026-005', supplier: 'Golden Crust Bakery', purchaseDate: inDays(-1), expiryDate: inDays(4),
      status: 'in_stock', minimumQuantity: 12, notes: 'Freshly baked butter brioche', createdBy: byRole.admin._id,
    },
    {
      itemName: 'San Marzano D.O.P. Whole Peeled Tomatoes', category: 'Dry Goods', quantity: 36, unit: 'cans', costPrice: 135,
      batchNumber: 'STK-2026-006', supplier: 'Napoli Food Direct', purchaseDate: inDays(-20), expiryDate: inDays(120),
      status: 'in_stock', minimumQuantity: 10, notes: 'Pizza base and slow cooked marinara', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Fresh Monterey Bay Squid', category: 'Meat & Seafood', quantity: 10, unit: 'kg', costPrice: 390,
      batchNumber: 'STK-2026-007', supplier: 'Pacific Coast Fishery', purchaseDate: inDays(-3), expiryDate: inDays(2),
      status: 'in_stock', minimumQuantity: 4, notes: 'Flash-fried calamari fritti prep', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Barista Grade Oat Milk', category: 'Beverages', quantity: 32, unit: 'L', costPrice: 210,
      batchNumber: 'STK-2026-008', supplier: 'PureOat Organics', purchaseDate: inDays(-7), expiryDate: inDays(25),
      status: 'in_stock', minimumQuantity: 8, notes: 'Plant-based coffee specialty lattes', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Wild Black Truffle Aioli', category: 'Produce', quantity: 8, unit: 'jars', costPrice: 780,
      batchNumber: 'STK-2026-009', supplier: 'Umbria Truffles', purchaseDate: inDays(-15), expiryDate: inDays(70),
      status: 'in_stock', minimumQuantity: 2, notes: 'Gourmet burger & parmesan fry dip', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Mediterranean Sea Bass Fillets', category: 'Meat & Seafood', quantity: 0, unit: 'kg', costPrice: 580,
      batchNumber: 'STK-2026-010', supplier: 'Coastal Catch Ltd', purchaseDate: inDays(-6), expiryDate: inDays(-1),
      status: 'expired', minimumQuantity: 5, wastedQuantity: 5, wasteReason: 'Expired past shelf life', notes: 'Out of stock & expired batch - discarded', createdBy: byRole.admin._id,
    },
  ]);

  const stockByName = Object.fromEntries(stockDocs.map((s) => [s.itemName, s]));

  console.log('🍕 Seeding menu catalog with recipe links...');
  const items = await MenuItem.insertMany(MENU.map(([name, sku, category, price, prepTimeMin, description, cost, recipe]) => {
    let recipeItems = [];
    if (sku === 'PIZ-0102') {
      recipeItems = [
        { stockItem: stockByName['Buffalo Mozzarella Cheese']?._id, stockItemName: 'Buffalo Mozzarella Cheese', quantityRequired: 0.2, unit: 'kg' },
        { stockItem: stockByName['San Marzano D.O.P. Whole Peeled Tomatoes']?._id, stockItemName: 'San Marzano D.O.P. Whole Peeled Tomatoes', quantityRequired: 1, unit: 'cans' },
      ];
    } else if (sku === 'BUR-0044') {
      recipeItems = [
        { stockItem: stockByName['Prime Wagyu Ground Chuck']?._id, stockItemName: 'Prime Wagyu Ground Chuck', quantityRequired: 0.2, unit: 'kg' },
        { stockItem: stockByName['Artisan Brioche Burger Buns']?._id, stockItemName: 'Artisan Brioche Burger Buns', quantityRequired: 1, unit: 'units' },
        { stockItem: stockByName['Wild Black Truffle Aioli']?._id, stockItemName: 'Wild Black Truffle Aioli', quantityRequired: 0.05, unit: 'jars' },
      ];
    } else if (sku === 'APP-0012') {
      recipeItems = [
        { stockItem: stockByName['Fresh Monterey Bay Squid']?._id, stockItemName: 'Fresh Monterey Bay Squid', quantityRequired: 0.25, unit: 'kg' },
      ];
    } else if (sku === 'BEV-0081') {
      recipeItems = [
        { stockItem: stockByName['Single-Origin Ethiopian Yirgacheffe Beans']?._id, stockItemName: 'Single-Origin Ethiopian Yirgacheffe Beans', quantityRequired: 0.03, unit: 'kg' },
      ];
    } else if (sku === 'MAI-0025') {
      recipeItems = [
        { stockItem: stockByName['Mediterranean Sea Bass Fillets']?._id, stockItemName: 'Mediterranean Sea Bass Fillets', quantityRequired: 0.3, unit: 'kg' },
      ];
    }

    const isSeaBass = sku === 'MAI-0025';
    return {
      name, sku, category, categoryId: catByName[category]?._id,
      price, cost, prepTimeMin, description, recipe,
      recipeItems,
      stockStatus: isSeaBass ? 'out_of_stock' : sku === 'BEV-0081' ? 'low_stock' : 'in_stock',
      isAvailable: !isSeaBass && sku !== 'BEV-0081',
      inventoryQuantity: isSeaBass ? 0 : sku === 'BEV-0081' ? 3 : 45,
      modifiers: category === 'Pizzas' ? [{ name: 'Extra cheese', price: 2 }, { name: 'Gluten-free base', price: 3 }] : [],
    };
  }));

  console.log('⚙️  Seeding settings, tables & coupons...');
  await Setting.create({ key: 'taxRate', value: 5 });

  const tables = await Table.insertMany(Array.from({ length: 12 }, (_, i) => ({
    code: `T-${String(i + 1).padStart(2, '0')}`,
    capacity: i < 4 ? 2 : i < 10 ? 4 : 6,
    section: i < 6 ? 'Main' : 'Patio',
    location: i < 6 ? 'Indoor' : 'Outdoor',
    status: 'available',
  })));

  await Coupon.insertMany(COUPONS);

  console.log('🧾 Generating 38 realistic orders across 3 days...');
  const sellable = items.filter((i) => i.isAvailable);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const states = ['completed', 'completed', 'completed', 'ready', 'preparing', 'pending', 'cancelled'];
  const methods = ['cash', 'upi', 'card'];
  const day = todayStr();
  const counters = {};
  let n = 0;
  let ticketSeq = 0;
  let paySeq = 0;
  let invSeq = 0;
  const openShiftOrders = [];

  for (let back = 2; back >= 0; back--) {
    const count = back === 0 ? 14 : 12;
    for (let k = 0; k < count; k++) {
      const when = new Date(Date.now() - back * 86400000);
      const hourPool = [11, 12, 13, 14, 19, 20, 21, 12, 13, 20];
      when.setUTCHours(hourPool[Math.floor(rnd() * hourPool.length)] - 5, Math.floor(rnd() * 60));
      const lines = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => {
        const m = sellable[Math.floor(rnd() * sellable.length)];
        return { menuItem: m._id, name: m.name, sku: m.sku, unitPrice: m.price, quantity: 1 + Math.floor(rnd() * 2), notes: '' };
      });
      const discount = rnd() < 0.2 ? { type: 'percent', value: 10 } : undefined;
      const bill = computeBill({ lines, taxRate: 5, discount });
      const status = back > 0 && ['ready', 'preparing', 'pending'].includes(states[k % 7]) ? 'completed' : states[k % 7];
      const paid = status === 'completed' || (status === 'ready' && rnd() < 0.5);
      const key = when.toISOString().slice(0, 10).replace(/-/g, '');
      counters[key] = (counters[key] || 0) + 1;
      n++;
      const method = methods[Math.floor(rnd() * 3)];
      const type = rnd() < 0.65 ? 'dine-in' : 'takeaway';
      const table = type === 'dine-in' ? tables[Math.floor(rnd() * tables.length)] : null;

      const stamps = {};
      if (status !== 'pending' && status !== 'cancelled') {
        stamps.acceptedAt = when;
        stamps.isConfirmed = true;
        stamps.confirmedAt = when;
        stamps.confirmedBy = byRole.cashier._id;
        stamps.preparedBy = byRole.kitchen._id;
      }
      if (['ready', 'delivered', 'completed'].includes(status)) {
        stamps.preparedAt = when;
      }
      if (['delivered', 'completed'].includes(status)) {
        stamps.acceptedForDeliveryBy = byRole.staff._id;
        stamps.acceptedForDeliveryAt = when;
        stamps.deliveredBy = byRole.staff._id;
        stamps.deliveredAt = when;
      }
      if (status === 'completed') {
        stamps.servedAt = when;
        stamps.completedAt = when;
      }

      const orderCreator = [byRole.cashier._id, byRole.shift_manager._id, byRole.cashier._id, byRole.staff._id][k % 4];

      const order = await Order.create({
        orderNumber: `ORD-${key}-${String(counters[key]).padStart(4, '0')}`,
        type,
        tableNumber: table ? table.code : null,
        tableId: table && status !== 'completed' && status !== 'cancelled' ? table._id : (table?._id || null),
        customerName: ['Marcus Vance', 'Elena Rostova', 'Liam Davis', 'Zoe Martinez', ''][k % 5],
        items: bill.lines,
        discount: bill.discountMinor ? discount : undefined,
        taxRate: 5,
        subtotal: bill.subtotal,
        discountAmount: bill.discountAmount,
        taxAmount: bill.taxAmount,
        total: bill.total,
        totalMinor: bill.totalMinor,
        status,
        statusHistory: [
          { status: 'pending', by: orderCreator, at: when },
          ...(status !== 'pending' ? [{ status, by: orderCreator, at: when }] : []),
        ],
        amountPaidMinor: paid ? bill.totalMinor : 0,
        payments: paid ? [{ method, amount: bill.total, amountMinor: bill.totalMinor, recordedBy: byRole.cashier._id, at: when }] : [],
        createdBy: orderCreator,
        createdAt: when,
        updatedAt: when,
        ...stamps,
      });

      if (back === 0) openShiftOrders.push(order);

      if (table && ['pending', 'preparing', 'ready'].includes(status) && type === 'dine-in') {
        table.status = 'occupied';
        table.currentOrder = order._id;
        await table.save();
      }

      if (['preparing', 'ready'].includes(status)) {
        ticketSeq += 1;
        await KitchenTicket.create({
          ticketNumber: `KT-${key}-${String(ticketSeq).padStart(4, '0')}`,
          order: order._id,
          items: order.items.map((i) => ({
            orderItemId: i._id,
            name: i.name,
            quantity: i.quantity,
            notes: i.notes || '',
            prepStatus: status === 'ready' ? 'ready' : 'preparing',
          })),
          status: status === 'ready' ? 'ready' : 'in_progress',
          assignedTo: byRole.kitchen._id,
          readyAt: status === 'ready' ? when : undefined,
          createdAt: when,
        });
      }

      if (paid) {
        paySeq += 1;
        await Payment.create({
          paymentRef: `PAY-${key}-${String(paySeq).padStart(4, '0')}`,
          order: order._id,
          amount: bill.total,
          amountMinor: bill.totalMinor,
          method,
          status: 'recorded',
          recordedBy: byRole.cashier._id,
          createdAt: when,
        });
      }

      if (status === 'completed') {
        invSeq += 1;
        await Invoice.create({
          invoiceNumber: `INV-${key}-${String(invSeq).padStart(4, '0')}`,
          order: order._id,
          snapshot: {
            orderNumber: order.orderNumber,
            type: order.type,
            tableNumber: order.tableNumber,
            items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            taxRate: order.taxRate,
            taxAmount: order.taxAmount,
            total: order.total,
          },
          issuedAt: when,
          createdAt: when,
        });
      }
    }
  }

  console.log('⏰ Initializing active register shift...');
  const shiftDay = day.replace(/-/g, '');
  const cashTotals = openShiftOrders.reduce((acc, o) => {
    for (const p of o.payments || []) acc[p.method] = (acc[p.method] || 0) + p.amount;
    return acc;
  }, { cash: 0, upi: 0, card: 0 });

  await Shift.create({
    shiftNumber: `SH-${shiftDay}-001`,
    openedBy: byRole.shift_manager._id,
    openingCash: 2000,
    expectedCash: 2000 + (cashTotals.cash || 0),
    totals: {
      cash: Math.round((cashTotals.cash || 0) * 100) / 100,
      upi: Math.round((cashTotals.upi || 0) * 100) / 100,
      card: Math.round((cashTotals.card || 0) * 100) / 100,
    },
    orderCount: openShiftOrders.length,
    cashMovements: [{ type: 'in', amount: 500, note: 'Float top-up', at: new Date(), by: byRole.shift_manager._id }],
    status: 'open',
    openedAt: new Date(Date.now() - 4 * 3600000),
    notes: 'Demo open shift',
  });

  await AuditLog.insertMany([
    { user: byRole.admin._id, action: 'seed', entityType: 'System', summary: 'Database seeded', meta: { users: users.length } },
    { user: byRole.shift_manager._id, action: 'shift.start', entityType: 'Shift', summary: 'Opened demo shift' },
    { user: byRole.cashier._id, action: 'order.payment', entityType: 'Order', summary: 'Sample payment audit' },
    { user: byRole.kitchen._id, action: 'kitchen.ready', entityType: 'KitchenTicket', summary: 'Sample kitchen audit' },
  ]);

  const todayKey = day.replace(/-/g, '');
  await Counter.create([
    { _id: `order-${day}`, seq: counters[todayKey] || 0 },
    { _id: `ticket-${day}`, seq: ticketSeq },
    { _id: `pay-${day}`, seq: paySeq },
    { _id: `invoice-${day}`, seq: invSeq },
    { _id: `shift-${day}`, seq: 1 },
  ]);

  console.log('✅ Seeding completed successfully!');
  console.log(`   - Users:        ${users.length}`);
  console.log(`   - Categories:   ${categories.length}`);
  console.log(`   - Menu Items:   ${items.length}`);
  console.log(`   - Stock Items:  ${stockDocs.length}`);
  console.log(`   - Tables:       ${tables.length}`);
  console.log(`   - Total Orders: ${n}`);
  console.log('');
  console.log('🔑 Credentials:');
  console.log('   👑 Admin:   admin@restoflow.test   / Admin@12345');
  console.log('   🧾 Staff:   staff@restoflow.test   / Staff@12345');
  console.log('   👔 Manager: manager@restoflow.test / Manager@12345');
  console.log('   💵 Cashier: cashier@restoflow.test / Cashier@12345');
  console.log('   🍳 Kitchen: kitchen@restoflow.test / Kitchen@12345');
  console.log('   🎟️ Coupons: WELCOME10, FLAT50');

  await mongoose.disconnect();
}

if (require.main === module) {
  runSeed().catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });
}

module.exports = { runSeed };
