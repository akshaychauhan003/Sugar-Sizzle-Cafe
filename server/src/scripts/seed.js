/**
 * Demo seed — WIPE + reseed (idempotent only in the sense of a full reset).
 * Clears Users, MenuItems, Orders, Counters, Settings, Categories, Tables,
 * Coupons, KitchenTickets, Payments, Invoices, Shifts, AuditLogs then inserts demo data.
 * Refuses to run in production unless SEED_ALLOW_PRODUCTION=true.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const Counter = require('../models/Counter');
const Category = require('../models/Category');
const Table = require('../models/Table');
const Coupon = require('../models/Coupon');
const KitchenTicket = require('../models/KitchenTicket');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Shift = require('../models/Shift');
const AuditLog = require('../models/AuditLog');
const Stock = require('../models/Stock');
const { computeBill } = require('../services/billing');
const { todayStr } = require('../lib/dates');

const DEMO_USERS = [
  { name: 'Sarah Jenkins', email: 'admin@restoflow.test', password: 'Admin@12345', role: 'admin', roles: ['admin', 'cashier', 'kitchen', 'staff'] },
  { name: 'Sam Carter', email: 'staff@restoflow.test', password: 'Staff@12345', role: 'staff', roles: ['staff'] },
  { name: 'Mia Lopez', email: 'manager@restoflow.test', password: 'Manager@12345', role: 'shift_manager', roles: ['shift_manager', 'cashier', 'staff'] },
  { name: 'Chris Patel', email: 'cashier@restoflow.test', password: 'Cashier@12345', role: 'cashier', roles: ['cashier'] },
  { name: 'Jordan Lee', email: 'kitchen@restoflow.test', password: 'Kitchen@12345', role: 'kitchen', roles: ['kitchen'] },
];

const MENU = [
  ['Classic Margherita Pizza', 'PIZ-0102', 'Pizzas', 18.5, 8, 'San Marzano tomato base, fresh buffalo mozzarella, fragrant basil', 6.5, 'Dough, sauce, mozzarella, basil'],
  ['Truffle Wagyu Burger', 'BUR-0044', 'Main Course', 24, 14, '200g prime Wagyu chuck, black truffle emulsion, smoked cheddar', 11, 'Bun, wagyu, truffle aioli, cheddar'],
  ['Crispy Calamari Fritti', 'APP-0012', 'Appetizers', 15, 6, 'Flash-fried Monterey squid, cracked sea salt, charred Meyer lemon', 5, 'Calamari, flour, lemon'],
  ['Cold Brew Tonic', 'BEV-0081', 'Beverages', 7, 3, 'Single-origin Ethiopian cold extraction with tonic', 1.5, 'Cold brew, tonic'],
  ['Traditional Venetian Tiramisu', 'DES-0019', 'Desserts', 11, 2, 'House-baked ladyfingers soaked in dark espresso and Marsala', 3.5, 'Mascarpone, espresso, cocoa'],
  ['Wild Mushroom & Truffle Risotto', 'RIS-0032', 'Main Course', 26, 16, 'Acquerello carnaroli rice, foraged chanterelles', 9, 'Rice, mushrooms, stock, truffle'],
  ['Crispy Truffle Fries', 'APP-0020', 'Starters', 7.5, 6, 'Parmesan & herb dust', 2, 'Potatoes, truffle oil, parmesan'],
  ['Smoked Chicken Wings', 'APP-0021', 'Starters', 9.2, 10, 'Glazed barbecue & dip', 3.2, 'Wings, BBQ glaze'],
  ['Molten Dark Choco Lava', 'DES-0022', 'Desserts', 6.5, 12, 'Vanilla bean quenelle', 2.1, 'Chocolate, butter, eggs'],
  ['Sparkling Yuzu Cooler', 'BEV-0023', 'Beverages', 4.5, 2, 'Japanese citrus & tonic', 0.9, 'Yuzu, tonic'],
  ['Mango Lychee Fizz', 'BEV-0024', 'Beverages', 5, 2, 'Crushed ice & fresh fruit', 1.1, 'Mango, lychee, soda'],
  ['Pan-Seared Sea Bass', 'MAI-0025', 'Main Course', 18, 15, 'Asparagus & lemon', 7.5, 'Sea bass, asparagus, lemon'],
];

(async () => {
  if (env.isProd && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    console.error('Refusing to seed in production (set SEED_ALLOW_PRODUCTION=true to override).'); process.exit(1);
  }
  env.validate();
  await mongoose.connect(env.mongoUri);

  await Promise.all([
    User.deleteMany({}), MenuItem.deleteMany({}), Order.deleteMany({}), Counter.deleteMany({}), Setting.deleteMany({}),
    Category.deleteMany({}), Table.deleteMany({}), Coupon.deleteMany({}), KitchenTicket.deleteMany({}),
    Payment.deleteMany({}), Invoice.deleteMany({}), Shift.deleteMany({}), AuditLog.deleteMany({}), Stock.deleteMany({}),
  ]);

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

  const categoryNames = [...new Set(MENU.map((m) => m[2]))];
  const categories = await Category.insertMany(categoryNames.map((name, i) => ({
    name, description: `${name} menu section`, displayOrder: i + 1, isActive: true,
  })));
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  const items = await MenuItem.insertMany(MENU.map(([name, sku, category, price, prepTimeMin, description, cost, recipe]) => ({
    name, sku, category, categoryId: catByName[category]?._id,
    price, cost, prepTimeMin, description, recipe,
    stockStatus: sku === 'MAI-0025' ? 'out_of_stock' : sku === 'BEV-0081' ? 'low_stock' : 'in_stock',
    isAvailable: sku !== 'MAI-0025' && sku !== 'BEV-0081',
    inventoryQuantity: sku === 'MAI-0025' ? 0 : sku === 'BEV-0081' ? 3 : 45,
    modifiers: category === 'Pizzas' ? [{ name: 'Extra cheese', price: 2 }, { name: 'Gluten-free base', price: 3 }] : [],
  })));

  const now = new Date();
  const inDays = (d) => new Date(now.getTime() + d * 86400000);

  await Stock.insertMany([
    {
      itemName: 'Buffalo Mozzarella Cheese', category: 'Dairy', quantity: 12, unit: 'kg', costPrice: 420,
      batchNumber: 'STK-2026-001', supplier: 'Artisan Valley Farms', purchaseDate: inDays(-5), expiryDate: inDays(3),
      status: 'in_stock', notes: 'Fresh Italian buffalo mozzarella for Neapolitan pizzas', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Heavy Dairy Cream', category: 'Dairy', quantity: 4, unit: 'L', costPrice: 180,
      batchNumber: 'STK-2026-002', supplier: 'Highland Pure Dairies', purchaseDate: inDays(-4), expiryDate: inDays(2),
      status: 'low_stock', notes: 'Dessert preparation & sauce reduction', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Prime Wagyu Ground Chuck', category: 'Meat & Seafood', quantity: 24, unit: 'kg', costPrice: 1200,
      batchNumber: 'STK-2026-003', supplier: 'Miyazaki Meats Co.', purchaseDate: inDays(-2), expiryDate: inDays(5),
      status: 'in_stock', notes: 'For signature Wagyu burgers', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Single-Origin Ethiopian Yirgacheffe Beans', category: 'Coffee & Tea', quantity: 45, unit: 'kg', costPrice: 650,
      batchNumber: 'STK-2026-004', supplier: 'Equator Coffee Roasters', purchaseDate: inDays(-10), expiryDate: inDays(50),
      status: 'in_stock', notes: 'Light floral roast for cold brew & espresso', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Artisan Brioche Burger Buns', category: 'Bakery', quantity: 48, unit: 'units', costPrice: 22,
      batchNumber: 'STK-2026-005', supplier: 'Golden Crust Bakery', purchaseDate: inDays(-1), expiryDate: inDays(4),
      status: 'in_stock', notes: 'Freshly baked butter brioche', createdBy: byRole.admin._id,
    },
    {
      itemName: 'San Marzano D.O.P. Whole Peeled Tomatoes', category: 'Dry Goods', quantity: 36, unit: 'cans', costPrice: 135,
      batchNumber: 'STK-2026-006', supplier: 'Napoli Food Direct', purchaseDate: inDays(-20), expiryDate: inDays(120),
      status: 'in_stock', notes: 'Pizza base and slow cooked marinara', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Fresh Monterey Bay Squid', category: 'Meat & Seafood', quantity: 10, unit: 'kg', costPrice: 390,
      batchNumber: 'STK-2026-007', supplier: 'Pacific Coast Fishery', purchaseDate: inDays(-3), expiryDate: inDays(2),
      status: 'in_stock', notes: 'Flash-fried calamari fritti prep', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Barista Grade Oat Milk', category: 'Beverages', quantity: 32, unit: 'L', costPrice: 210,
      batchNumber: 'STK-2026-008', supplier: 'PureOat Organics', purchaseDate: inDays(-7), expiryDate: inDays(25),
      status: 'in_stock', notes: 'Plant-based coffee specialty lattes', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Wild Black Truffle Aioli', category: 'Produce', quantity: 8, unit: 'jars', costPrice: 780,
      batchNumber: 'STK-2026-009', supplier: 'Umbria Truffles', purchaseDate: inDays(-15), expiryDate: inDays(70),
      status: 'in_stock', notes: 'Gourmet burger & parmesan fry dip', createdBy: byRole.admin._id,
    },
    {
      itemName: 'Mediterranean Sea Bass Fillets', category: 'Meat & Seafood', quantity: 0, unit: 'kg', costPrice: 580,
      batchNumber: 'STK-2026-010', supplier: 'Coastal Catch Ltd', purchaseDate: inDays(-6), expiryDate: inDays(-1),
      status: 'expired', notes: 'Out of stock & expired batch - pending discard', createdBy: byRole.admin._id,
    },
  ]);

  await Setting.create({ key: 'taxRate', value: 5 });

  const tables = await Table.insertMany(Array.from({ length: 12 }, (_, i) => ({
    code: `T-${String(i + 1).padStart(2, '0')}`,
    capacity: i < 4 ? 2 : i < 10 ? 4 : 6,
    section: i < 6 ? 'Main' : 'Patio',
    location: i < 6 ? 'Indoor' : 'Outdoor',
    status: 'available',
  })));

  await Coupon.insertMany([
    {
      code: 'WELCOME10', description: '10% off first orders', discountType: 'percent', discountValue: 10,
      minOrderAmount: 20, maxUses: 100, usedCount: 0, isActive: true,
    },
    {
      code: 'FLAT50', description: 'Flat 50 off', discountType: 'flat', discountValue: 50,
      minOrderAmount: 150, maxUses: 50, usedCount: 0, isActive: true,
    },
  ]);

  const sellable = items.filter((i) => i.isAvailable);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const states = ['completed', 'completed', 'completed', 'ready', 'preparing', 'pending', 'cancelled'];
  const methods = ['cash', 'upi', 'card'];
  const day = todayStr(); const counters = {};
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
      counters[key] = (counters[key] || 0) + 1; n++;
      const method = methods[Math.floor(rnd() * 3)];
      const type = rnd() < 0.65 ? 'dine-in' : 'takeaway';
      const table = type === 'dine-in' ? tables[Math.floor(rnd() * tables.length)] : null;

      const stamps = {};
      if (status !== 'pending' && status !== 'cancelled') stamps.acceptedAt = when;
      if (['ready', 'completed'].includes(status)) stamps.preparedAt = when;
      if (status === 'completed') { stamps.servedAt = when; stamps.completedAt = when; }

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
          { status: 'pending', by: byRole.staff._id, at: when },
          ...(status !== 'pending' ? [{ status, by: byRole.staff._id, at: when }] : []),
        ],
        amountPaidMinor: paid ? bill.totalMinor : 0,
        payments: paid ? [{ method, amount: bill.total, amountMinor: bill.totalMinor, recordedBy: byRole.cashier._id, at: when }] : [],
        createdBy: byRole.staff._id,
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

  // Align counters so live creates continue cleanly for today
  const todayKey = day.replace(/-/g, '');
  await Counter.create([
    { _id: `order-${day}`, seq: counters[todayKey] || 0 },
    { _id: `ticket-${day}`, seq: ticketSeq },
    { _id: `pay-${day}`, seq: paySeq },
    { _id: `invoice-${day}`, seq: invSeq },
    { _id: `shift-${day}`, seq: 1 },
  ]);

  console.log(`Seeded ${users.length} users, ${categories.length} categories, ${items.length} menu items, ${tables.length} tables, ${n} orders (${day}).`);
  console.log('Demo logins:');
  console.log('  admin@restoflow.test / Admin@12345');
  console.log('  staff@restoflow.test / Staff@12345');
  console.log('  manager@restoflow.test / Manager@12345');
  console.log('  cashier@restoflow.test / Cashier@12345');
  console.log('  kitchen@restoflow.test / Kitchen@12345');
  console.log('Coupons: WELCOME10, FLAT50');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
