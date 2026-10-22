const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Coupon = require('../models/Coupon');
const Setting = require('../models/Setting');
const Shift = require('../models/Shift');
const Stock = require('../models/Stock');
const { DEMO_USERS, MENU, COUPONS } = require('../data/demoData');

let isSeeding = false;

/**
 * Ensures all standard demo users exist and have their passwords updated to standard credentials.
 * This guarantees that even if an old database or empty cluster is deployed, staff logins always succeed.
 */
async function ensureDemoUsers() {
  const results = [];
  for (const demo of DEMO_USERS) {
    const existing = await User.findOne({
      $or: [
        { username: demo.username },
        { email: demo.email },
        { email: `${demo.username}@restoflow.test` },
      ],
    }).select('+passwordHash');

    if (!existing) {
      const hash = await bcrypt.hash(demo.password, 10);
      const created = await User.create({
        name: demo.name,
        username: demo.username,
        email: demo.email,
        passwordHash: hash,
        role: demo.role,
        roles: demo.roles || [demo.role],
        phone: demo.phone || '',
        branch: 'Main',
        isActive: true,
      });
      results.push({ username: demo.username, action: 'created', id: created._id });
    } else {
      // Verify password matches; if not (e.g. from older seeds), update passwordHash and ensure username is populated
      const matches = await bcrypt.compare(demo.password, existing.passwordHash || '');
      let updated = false;
      if (!matches) {
        existing.passwordHash = await bcrypt.hash(demo.password, 10);
        updated = true;
      }
      if (!existing.username || existing.username !== demo.username) {
        existing.username = demo.username;
        updated = true;
      }
      if (!existing.roles || !existing.roles.length) {
        existing.roles = demo.roles || [demo.role];
        updated = true;
      }
      if (!existing.isActive) {
        existing.isActive = true;
        updated = true;
      }
      if (updated) {
        await existing.save();
        results.push({ username: demo.username, action: 'updated', id: existing._id });
      } else {
        results.push({ username: demo.username, action: 'verified', id: existing._id });
      }
    }
  }
  return results;
}

/**
 * Self-healing seeder:
 * If the database is completely empty (no users or menu items) or if forced,
 * automatically populates the Sugar & Sizzle café catalog, tables, categories, and demo users.
 */
async function autoSeedDatabase(force = false) {
  if (isSeeding) return { status: 'already_running' };
  isSeeding = true;
  try {
    const userCount = await User.countDocuments();
    const menuCount = await MenuItem.countDocuments();

    if (!force && userCount > 0 && menuCount > 0) {
      await ensureDemoUsers();
      return { status: 'intact', userCount, menuCount };
    }

    console.log('🌱 [AutoSeed] Initializing Sugar & Sizzle Café database...');

    // 1. Ensure Demo Users
    await ensureDemoUsers();
    const adminUser = await User.findOne({ username: 'admin' });

    // 2. Categories
    const categoryNames = ['Hot Drinks', 'Cold Drinks', 'Shakes', 'Juices & Coolers'];
    const catDocs = [];
    for (let i = 0; i < categoryNames.length; i++) {
      const name = categoryNames[i];
      let cat = await Category.findOne({ name });
      if (!cat) {
        cat = await Category.create({
          name,
          description: `${name} specialty section`,
          displayOrder: i + 1,
          isActive: true,
        });
      }
      catDocs.push(cat);
    }
    const catByName = Object.fromEntries(catDocs.map((c) => [c.name, c]));

    // 3. Menu Items
    if (menuCount === 0 || force) {
      if (force) await MenuItem.deleteMany({});
      for (const [name, sku, category, price, prepTimeMin, description, cost, recipe] of MENU) {
        const isOutOfStock = sku === 'JUC-06';
        const isLowStock = sku === 'JUC-01';

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

        await MenuItem.findOneAndUpdate(
          { sku },
          {
            name,
            sku,
            category,
            categoryId: catByName[category]?._id,
            price,
            cost,
            prepTimeMin,
            description,
            recipe,
            stockStatus: isOutOfStock ? 'out_of_stock' : isLowStock ? 'low_stock' : 'in_stock',
            isAvailable: !isOutOfStock,
            inventoryQuantity: isOutOfStock ? 0 : isLowStock ? 4 : 50,
            modifiers,
          },
          { upsert: true, new: true }
        );
      }
    }

    // 4. Tables
    const tableCount = await Table.countDocuments();
    if (tableCount === 0 || force) {
      if (force) await Table.deleteMany({});
      for (let i = 0; i < 12; i++) {
        const code = `T-${String(i + 1).padStart(2, '0')}`;
        await Table.findOneAndUpdate(
          { code },
          {
            code,
            capacity: i < 4 ? 2 : i < 10 ? 4 : 6,
            section: i < 6 ? 'Main' : 'Patio',
            location: i < 6 ? 'Indoor' : 'Outdoor',
            status: 'available',
          },
          { upsert: true }
        );
      }
    }

    // 5. Coupons
    for (const c of COUPONS) {
      await Coupon.findOneAndUpdate({ code: c.code }, c, { upsert: true });
    }

    // 6. Settings
    await Setting.findOneAndUpdate(
      { key: 'taxRate' },
      { key: 'taxRate', value: 5 },
      { upsert: true }
    );

    // 7. Active Shift
    const activeShift = await Shift.findOne({ status: 'open' });
    if (!activeShift && adminUser) {
      await Shift.create({
        cashierId: adminUser._id,
        cashierName: adminUser.name,
        openingFloat: 2000,
        openedAt: new Date(),
        status: 'open',
      });
    }

    console.log('✅ [AutoSeed] Database initialized successfully.');
    return {
      status: 'seeded',
      users: await User.countDocuments(),
      menuItems: await MenuItem.countDocuments(),
      tables: await Table.countDocuments(),
    };
  } catch (err) {
    console.error('❌ [AutoSeed] Seeding error:', err);
    throw err;
  } finally {
    isSeeding = false;
  }
}

module.exports = {
  ensureDemoUsers,
  autoSeedDatabase,
  DEMO_USERS,
};
