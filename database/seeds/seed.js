/**
 * Master Database Seed Script — Sugar & Sizzle Café (Artisan Coffee & Drinks POS)
 * Resets collections and seeds:
 * - Admin, Staff, Shift Manager, Cashier, Kitchen accounts with simple IDs & passwords
 * - 4 Beverage Categories: Hot Drinks, Cold Drinks, Shakes, Juices & Coolers
 * - 23 Handcrafted drinks with recipes, costs, and modifiers
 * - Stock inventory with shelf-life, batch numbers, and expiry tracking
 * - 12 cafe tables across Indoor Main and Outdoor Patio (Available, Occupied, Cleaning)
 * - Discount coupons (WELCOME10, FLAT50)
 * - 38 realistic drink orders across 3 days with tickets, payments, and invoices
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

  console.log('👤 Seeding demo users with direct role IDs and simple passwords...');
  const users = [];
  for (const u of DEMO_USERS) {
    users.push(await User.create({
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      roles: u.roles || [u.role],
      phone: u.phone || '',
      passwordHash: await bcrypt.hash(u.password, 10),
    }));
  }
  const byRole = Object.fromEntries(users.map((u) => [u.role, u]));

  console.log('🏷️  Seeding beverage categories...');
  const categoryNames = ['Hot Drinks', 'Cold Drinks', 'Shakes', 'Juices & Coolers'];
  const categories = await Category.insertMany(categoryNames.map((name, i) => ({
    name,
    description: `${name} specialty section`,
    displayOrder: i + 1,
    isActive: true,
  })));
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  const now = new Date();
  const inDays = (d) => new Date(now.getTime() + d * 86400000);

  console.log('📦 Seeding beverage stock inventory...');
  const stockDocs = await Stock.insertMany([
    {
      itemName: 'Single-Origin Ethiopian Yirgacheffe Beans',
      category: 'Coffee & Tea',
      quantity: 45,
      unit: 'kg',
      costPrice: 650,
      batchNumber: 'STK-2026-001',
      supplier: 'Equator Coffee Roasters',
      purchaseDate: inDays(-10),
      expiryDate: inDays(50),
      status: 'in_stock',
      minimumQuantity: 10,
      notes: 'Light floral roast for cold brew & espresso',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Barista Grade Whole Dairy Milk',
      category: 'Dairy',
      quantity: 35,
      unit: 'L',
      costPrice: 65,
      batchNumber: 'STK-2026-002',
      supplier: 'Highland Pure Dairies',
      purchaseDate: inDays(-2),
      expiryDate: inDays(5),
      status: 'in_stock',
      minimumQuantity: 10,
      notes: 'Fresh pasteurized whole milk for lattes & cappuccinos',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Barista Grade Oat Milk',
      category: 'Beverages',
      quantity: 28,
      unit: 'L',
      costPrice: 210,
      batchNumber: 'STK-2026-003',
      supplier: 'PureOat Organics',
      purchaseDate: inDays(-7),
      expiryDate: inDays(25),
      status: 'in_stock',
      minimumQuantity: 8,
      notes: 'Plant-based coffee specialty lattes',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Raw Organic Hot Honey Infusion',
      category: 'Produce',
      quantity: 18,
      unit: 'jars',
      costPrice: 320,
      batchNumber: 'STK-2026-004',
      supplier: 'Smoky Ridge Apiaries',
      purchaseDate: inDays(-12),
      expiryDate: inDays(90),
      status: 'in_stock',
      minimumQuantity: 4,
      notes: 'Chili infused wild blossom honey for signature cappuccino',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Callebaut 70% Dark Chocolate Callets',
      category: 'Dry Goods',
      quantity: 20,
      unit: 'kg',
      costPrice: 850,
      batchNumber: 'STK-2026-005',
      supplier: 'Belgian Cocoa Importers',
      purchaseDate: inDays(-15),
      expiryDate: inDays(75),
      status: 'in_stock',
      minimumQuantity: 5,
      notes: 'For Belgian mochas and dark chocolate thickshakes',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Madagascar Vanilla Bean Syrup',
      category: 'Beverages',
      quantity: 14,
      unit: 'bottles',
      costPrice: 450,
      batchNumber: 'STK-2026-006',
      supplier: 'Monin Artisanal',
      purchaseDate: inDays(-8),
      expiryDate: inDays(60),
      status: 'in_stock',
      minimumQuantity: 3,
      notes: 'Natural vanilla bean reduction',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'House Salted Caramel Sauce',
      category: 'Beverages',
      quantity: 12,
      unit: 'bottles',
      costPrice: 380,
      batchNumber: 'STK-2026-007',
      supplier: 'Artisan Confectionery Co',
      purchaseDate: inDays(-6),
      expiryDate: inDays(40),
      status: 'in_stock',
      minimumQuantity: 3,
      notes: 'Buttery caramel with sea salt crystals',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Ceremonial Uji Japanese Matcha',
      category: 'Coffee & Tea',
      quantity: 8,
      unit: 'tins',
      costPrice: 920,
      batchNumber: 'STK-2026-008',
      supplier: 'Kyoto Tea Collective',
      purchaseDate: inDays(-14),
      expiryDate: inDays(45),
      status: 'in_stock',
      minimumQuantity: 2,
      notes: 'First-harvest shade-grown green tea powder',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Fresh Golden Assam CTC Tea Leaves',
      category: 'Coffee & Tea',
      quantity: 22,
      unit: 'kg',
      costPrice: 380,
      batchNumber: 'STK-2026-009',
      supplier: 'Brahmaputra Valley Tea',
      purchaseDate: inDays(-20),
      expiryDate: inDays(120),
      status: 'in_stock',
      minimumQuantity: 5,
      notes: 'Strong malty brew for royal cardamom masala chai',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Ratnagiri Alphonso Mango Pulp',
      category: 'Produce',
      quantity: 16,
      unit: 'kg',
      costPrice: 280,
      batchNumber: 'STK-2026-010',
      supplier: 'Konkan Fruit Orchard',
      purchaseDate: inDays(-5),
      expiryDate: inDays(20),
      status: 'in_stock',
      minimumQuantity: 4,
      notes: 'Fresh sweet mango puree for shakes and coolers',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Pure Japanese Yuzu Citrus Extract',
      category: 'Beverages',
      quantity: 9,
      unit: 'bottles',
      costPrice: 520,
      batchNumber: 'STK-2026-011',
      supplier: 'Shikoku Citrus Exports',
      purchaseDate: inDays(-18),
      expiryDate: inDays(35),
      status: 'in_stock',
      minimumQuantity: 2,
      notes: 'Aromatic tart yuzu juice for sparkling coolers',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Hydroponic Garden Spearmint',
      category: 'Produce',
      quantity: 3,
      unit: 'bunches',
      costPrice: 40,
      batchNumber: 'STK-2026-012',
      supplier: 'GreenLeaf Hydroponics',
      purchaseDate: inDays(-2),
      expiryDate: inDays(2),
      status: 'low_stock',
      minimumQuantity: 5,
      notes: 'Fresh aromatic mint for coolers and mojitos',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Heavy Dairy Cream 36%',
      category: 'Dairy',
      quantity: 4,
      unit: 'L',
      costPrice: 180,
      batchNumber: 'STK-2026-013',
      supplier: 'Highland Pure Dairies',
      purchaseDate: inDays(-3),
      expiryDate: inDays(1),
      status: 'low_stock',
      minimumQuantity: 6,
      notes: 'Whipped cream toppings for shakes and mochas',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Pure Nutella Hazelnut Spread',
      category: 'Dry Goods',
      quantity: 10,
      unit: 'tubs',
      costPrice: 620,
      batchNumber: 'STK-2026-014',
      supplier: 'Ferrero Distribution',
      purchaseDate: inDays(-25),
      expiryDate: inDays(80),
      status: 'in_stock',
      minimumQuantity: 3,
      notes: 'For signature Nutella roasted hazelnut thickshakes',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Fresh Seedless Watermelons',
      category: 'Produce',
      quantity: 25,
      unit: 'kg',
      costPrice: 45,
      batchNumber: 'STK-2026-015',
      supplier: 'SunValley Fresh Produce',
      purchaseDate: inDays(-3),
      expiryDate: inDays(4),
      status: 'in_stock',
      minimumQuantity: 8,
      notes: 'Cold-pressed fresh watermelon basil juices',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Fresh Sweet Valencia Oranges',
      category: 'Produce',
      quantity: 30,
      unit: 'kg',
      costPrice: 70,
      batchNumber: 'STK-2026-016',
      supplier: 'Citrus Grove Farms',
      purchaseDate: inDays(-4),
      expiryDate: inDays(6),
      status: 'in_stock',
      minimumQuantity: 10,
      notes: 'Cold-pressed orange ginger wellness elixirs',
      createdBy: byRole.admin._id,
    },
    {
      itemName: 'Expired Sweet Lime Puree Batch',
      category: 'Produce',
      quantity: 0,
      unit: 'kg',
      costPrice: 220,
      batchNumber: 'STK-2026-017',
      supplier: 'SunValley Fresh Produce',
      purchaseDate: inDays(-8),
      expiryDate: inDays(-1),
      status: 'expired',
      minimumQuantity: 5,
      wastedQuantity: 6,
      wasteReason: 'Expired past shelf life',
      notes: 'Out of stock & expired batch - safely disposed',
      createdBy: byRole.admin._id,
    },
  ]);

  const stockByName = Object.fromEntries(stockDocs.map((s) => [s.itemName, s]));

  console.log('☕ Seeding drink menu catalog with recipe links...');
  const items = await MenuItem.insertMany(MENU.map(([name, sku, category, price, prepTimeMin, description, cost, recipe]) => {
    let recipeItems = [];
    if (sku === 'HOT-01') {
      recipeItems = [
        { stockItem: stockByName['Single-Origin Ethiopian Yirgacheffe Beans']?._id, stockItemName: 'Single-Origin Ethiopian Yirgacheffe Beans', quantityRequired: 0.02, unit: 'kg' },
        { stockItem: stockByName['Barista Grade Whole Dairy Milk']?._id, stockItemName: 'Barista Grade Whole Dairy Milk', quantityRequired: 0.18, unit: 'L' },
        { stockItem: stockByName['Raw Organic Hot Honey Infusion']?._id, stockItemName: 'Raw Organic Hot Honey Infusion', quantityRequired: 0.05, unit: 'jars' },
      ];
    } else if (sku === 'HOT-05') {
      recipeItems = [
        { stockItem: stockByName['Single-Origin Ethiopian Yirgacheffe Beans']?._id, stockItemName: 'Single-Origin Ethiopian Yirgacheffe Beans', quantityRequired: 0.02, unit: 'kg' },
        { stockItem: stockByName['Callebaut 70% Dark Chocolate Callets']?._id, stockItemName: 'Callebaut 70% Dark Chocolate Callets', quantityRequired: 0.04, unit: 'kg' },
        { stockItem: stockByName['Barista Grade Whole Dairy Milk']?._id, stockItemName: 'Barista Grade Whole Dairy Milk', quantityRequired: 0.2, unit: 'L' },
      ];
    } else if (sku === 'CLD-01') {
      recipeItems = [
        { stockItem: stockByName['Single-Origin Ethiopian Yirgacheffe Beans']?._id, stockItemName: 'Single-Origin Ethiopian Yirgacheffe Beans', quantityRequired: 0.04, unit: 'kg' },
      ];
    } else if (sku === 'SHK-01') {
      recipeItems = [
        { stockItem: stockByName['Callebaut 70% Dark Chocolate Callets']?._id, stockItemName: 'Callebaut 70% Dark Chocolate Callets', quantityRequired: 0.05, unit: 'kg' },
        { stockItem: stockByName['Barista Grade Whole Dairy Milk']?._id, stockItemName: 'Barista Grade Whole Dairy Milk', quantityRequired: 0.25, unit: 'L' },
        { stockItem: stockByName['Heavy Dairy Cream 36%']?._id, stockItemName: 'Heavy Dairy Cream 36%', quantityRequired: 0.05, unit: 'L' },
      ];
    } else if (sku === 'SHK-04') {
      recipeItems = [
        { stockItem: stockByName['Pure Nutella Hazelnut Spread']?._id, stockItemName: 'Pure Nutella Hazelnut Spread', quantityRequired: 0.08, unit: 'tubs' },
        { stockItem: stockByName['Barista Grade Whole Dairy Milk']?._id, stockItemName: 'Barista Grade Whole Dairy Milk', quantityRequired: 0.25, unit: 'L' },
      ];
    } else if (sku === 'JUC-01') {
      recipeItems = [
        { stockItem: stockByName['Pure Japanese Yuzu Citrus Extract']?._id, stockItemName: 'Pure Japanese Yuzu Citrus Extract', quantityRequired: 0.05, unit: 'bottles' },
        { stockItem: stockByName['Hydroponic Garden Spearmint']?._id, stockItemName: 'Hydroponic Garden Spearmint', quantityRequired: 0.1, unit: 'bunches' },
      ];
    } else if (sku === 'JUC-03') {
      recipeItems = [
        { stockItem: stockByName['Fresh Seedless Watermelons']?._id, stockItemName: 'Fresh Seedless Watermelons', quantityRequired: 0.4, unit: 'kg' },
      ];
    }

    const isOutOfStock = sku === 'JUC-06'; // Pink Guava Chili Sparkler demo low/out of stock
    const isLowStock = sku === 'JUC-01'; // Spearmint low stock

    let modifiers = [];
    if (category === 'Hot Drinks' || category === 'Cold Drinks') {
      modifiers = [
        { name: 'Extra Espresso Shot', price: 40 },
        { name: 'Barista Oat Milk Substitute', price: 35 },
        { name: 'Sugar-Free Monkfruit Drops', price: 20 },
      ];
    } else if (category === 'Shakes') {
      modifiers = [
        { name: 'Extra Whipped Cream & Fudge', price: 30 },
        { name: 'Whey Protein Boost (+15g)', price: 60 },
        { name: 'Crushed Oreo & Hazelnut Dust', price: 25 },
      ];
    } else if (category === 'Juices & Coolers') {
      modifiers = [
        { name: 'Chia Seeds Superfood Boost', price: 25 },
        { name: 'Extra Muddled Fresh Mint', price: 15 },
      ];
    }

    return {
      name,
      sku,
      category,
      categoryId: catByName[category]?._id,
      price,
      cost,
      prepTimeMin,
      description,
      recipe,
      recipeItems,
      stockStatus: isOutOfStock ? 'out_of_stock' : isLowStock ? 'low_stock' : 'in_stock',
      isAvailable: !isOutOfStock,
      inventoryQuantity: isOutOfStock ? 0 : isLowStock ? 4 : 50,
      modifiers,
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

  console.log('🧾 Generating 38 realistic drink orders across 3 days...');
  const sellable = items.filter((i) => i.isAvailable);
  let seed = 19;
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
      const hourPool = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20];
      when.setUTCHours(hourPool[Math.floor(rnd() * hourPool.length)] - 5, Math.floor(rnd() * 60));

      const lines = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => {
        const m = sellable[Math.floor(rnd() * sellable.length)];
        return { menuItem: m._id, name: m.name, sku: m.sku, unitPrice: m.price, quantity: 1 + Math.floor(rnd() * 2), notes: '' };
      });
      const discount = rnd() < 0.25 ? { type: 'percent', value: 10 } : undefined;
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
        customerName: ['Marcus Vance', 'Elena Rostova', 'Liam Davis', 'Zoe Martinez', 'Aarav Sharma', 'Priya Patel', ''][k % 7],
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

      // Tables with active orders remain occupied
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
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          discountAmount: order.discountAmount,
          total: order.total,
          paymentMethod: method,
          issuedAt: when,
          issuedBy: byRole.cashier._id,
        });
      }
    }
  }

  // Pre-seed one table in 'cleaning' state for waitstaff demonstration
  const t7 = tables.find((t) => t.code === 'T-07');
  if (t7 && t7.status === 'available') {
    t7.status = 'cleaning';
    await t7.save();
  }

  console.log('⏰ Opening active café shift...');
  const openedAt = new Date();
  openedAt.setUTCHours(openedAt.getUTCHours() - 3);
  await Shift.create({
    shiftNumber: `SH-${day.replace(/-/g, '')}-0001`,
    openedBy: byRole.cashier._id,
    openedAt,
    openingFloat: 2000,
    status: 'open',
    branch: 'Main',
  });

  await AuditLog.insertMany([
    { user: byRole.admin._id, action: 'seed', entityType: 'System', summary: 'Database seeded with all-drinks catalog & role IDs', meta: { users: users.length } },
    { user: byRole.shift_manager._id, action: 'shift.start', entityType: 'Shift', summary: 'Opened morning café barista shift' },
    { user: byRole.cashier._id, action: 'order.payment', entityType: 'Order', summary: 'Processed cold brew & shake checkout' },
    { user: byRole.kitchen._id, action: 'kitchen.ready', entityType: 'KitchenTicket', summary: 'Prepared hot honey cappuccino' },
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
  console.log(`   - Categories:   ${categories.length} (Hot Drinks, Cold Drinks, Shakes, Juices & Coolers)`);
  console.log(`   - Menu Drinks:  ${items.length}`);
  console.log(`   - Stock Items:  ${stockDocs.length}`);
  console.log(`   - Tables:       ${tables.length} (Available, Occupied, Cleaning)`);
  console.log(`   - Total Orders: ${n}`);
  console.log('');
  console.log('🔑 Redesigned Credentials (Login with User ID or Email):');
  console.log('   👑 Admin:       admin   or admin@sugarsizzle.com   / Admin@123');
  console.log('   💵 Cashier:     cashier or cashier@sugarsizzle.com / Cashier@123');
  console.log('   🍳 Chef:        chef    or chef@sugarsizzle.com    / Chef@123');
  console.log('   🍽️ Waitstaff:   staff   or staff@sugarsizzle.com   / Staff@123');
  console.log('   👔 Manager:     manager or manager@sugarsizzle.com / Manager@123');
  console.log('   🎟️ Promo Codes: WELCOME10, FLAT50');

  await mongoose.disconnect();
}

if (require.main === module) {
  runSeed().catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  });
}

module.exports = { runSeed };
