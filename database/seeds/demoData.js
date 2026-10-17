/**
 * Centralized Demo Data Fixtures for Sugar & Sizzle (RestoFlow POS)
 * Contains demo accounts, cafe menu items, inventory ingredients, vibe tables, and coupon codes.
 */

const DEMO_USERS = [
  {
    name: 'Sarah Jenkins',
    email: 'admin@restoflow.test',
    password: 'Admin@12345',
    role: 'admin',
    roles: ['admin', 'cashier', 'kitchen', 'staff'],
  },
  {
    name: 'Sam Carter',
    email: 'staff@restoflow.test',
    password: 'Staff@12345',
    role: 'staff',
    roles: ['staff'],
  },
  {
    name: 'Mia Lopez',
    email: 'manager@restoflow.test',
    password: 'Manager@12345',
    role: 'shift_manager',
    roles: ['shift_manager', 'cashier', 'staff'],
  },
  {
    name: 'Chris Patel',
    email: 'cashier@restoflow.test',
    password: 'Cashier@12345',
    role: 'cashier',
    roles: ['cashier'],
  },
  {
    name: 'Jordan Lee',
    email: 'kitchen@restoflow.test',
    password: 'Kitchen@12345',
    role: 'kitchen',
    roles: ['kitchen'],
  },
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

const COUPONS = [
  {
    code: 'WELCOME10',
    description: '10% off first orders',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 20,
    maxUses: 100,
    usedCount: 0,
    isActive: true,
  },
  {
    code: 'FLAT50',
    description: 'Flat ₹50 off orders above ₹150',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 150,
    maxUses: 50,
    usedCount: 0,
    isActive: true,
  },
];

module.exports = {
  DEMO_USERS,
  MENU,
  COUPONS,
};
