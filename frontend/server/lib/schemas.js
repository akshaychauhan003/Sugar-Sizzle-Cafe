const { z } = require('zod');
const { ROLES } = require('./roles');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const money = z.number().finite().min(0).max(1_000_000).refine((n) => Math.round(n * 100) / 100 === n, 'Max 2 decimal places');

const idParam = z.object({ id: objectId });

const discountInput = z.object({
  type: z.enum(['percent', 'flat']),
  value: z.number().finite().min(0).max(1_000_000),
}).refine((d) => d.type !== 'percent' || d.value <= 100, { message: 'Percent discount must be 0-100', path: ['value'] });

const orderItemInput = z.object({
  menuItemId: objectId,
  quantity: z.number().int().min(1).max(99),
  notes: z.string().trim().max(200).optional().default(''),
});

const orderBase = {
  type: z.enum(['dine-in', 'takeaway']),
  tableNumber: z.string().trim().min(1).max(20).optional(),
  tableId: objectId.optional(),
  customerName: z.string().trim().max(80).optional().default(''),
  notes: z.string().trim().max(300).optional().default(''),
  items: z.array(orderItemInput).min(1, 'Add at least one item').max(50),
  discount: discountInput.optional(),
  couponCode: z.string().trim().min(1).max(30).optional(),
};
const dineInRule = (o) => o.type !== 'dine-in' || !!o.tableNumber || !!o.tableId;
const dineInMsg = { message: 'tableNumber is required for dine-in orders', path: ['tableNumber'] };
const createOrder = z.object(orderBase).refine(dineInRule, dineInMsg);
const updateOrder = z.object({ ...orderBase }).partial().refine(
  (o) => Object.keys(o).length > 0, { message: 'Provide at least one field' });

const changeStatus = z.object({
  status: z.enum(['preparing', 'ready', 'delivered', 'completed', 'cancelled']),
  note: z.string().trim().max(200).optional(),
});

const wasteStock = z.object({
  quantity: z.number().positive(),
  reason: z.string().trim().min(1).max(200),
});

const recordPayment = z.object({
  method: z.enum(['cash', 'upi', 'card']),
  amount: z.number().finite().positive().max(1_000_000).refine((n) => Math.round(n * 100) / 100 === n, 'Max 2 decimal places').optional(),
  reference: z.string().trim().max(100).optional().default(''),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

const modifierInput = z.object({
  name: z.string().trim().min(1).max(60),
  price: money,
});

const menuBase = {
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(30).optional(),
  category: z.string().trim().min(1).max(60),
  categoryId: objectId.optional().nullable(),
  description: z.string().trim().max(500).optional(),
  price: money,
  cost: money.optional().nullable(),
  prepTimeMin: z.number().int().min(0).max(240).optional(),
  imageUrl: z.string().trim().max(500000).refine((v) => v === '' || /^https?:\/\//i.test(v) || /^\//i.test(v) || /^data:image\/[a-zA-Z+]+;base64,/i.test(v), 'Must be a valid URL, path, or data URL').optional(),
  recipe: z.string().trim().max(2000).optional(),
  modifiers: z.array(modifierInput).max(20).optional(),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']).optional(),
  inventoryQuantity: z.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
};
const createMenu = z.object(menuBase);
const updateMenu = z.object(menuBase).partial().refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field' });
const availability = z.object({ isAvailable: z.boolean() });
const stockStatusUpdate = z.object({
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock']),
  inventoryQuantity: z.number().int().min(0).nullable().optional(),
  isAvailable: z.boolean().optional(),
});
const refundOrder = z.object({
  amount: money.optional(),
  reason: z.string().trim().max(200).optional().default(''),
});

const salesReturnItem = z.object({
  menuItemId: objectId,
  quantity: z.number().int().min(1),
  restock: z.boolean().default(true),
});

const salesReturn = z.object({
  reason: z.string().trim().max(250).optional().default('Customer Sales Return'),
  restock: z.boolean().default(true),
  items: z.array(salesReturnItem).optional(),
  refundAmount: money.optional(),
  paymentMethod: z.enum(['cash', 'upi', 'card']).default('cash'),
  password: z.string().optional(),
});

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
const page = { page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) };
const menuQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  available: bool.optional(),
  includeInactive: bool.optional(),
  sort: z.enum(['name', '-name', 'price', '-price', 'category', '-createdAt']).default('name'),
  ...page,
});
const orderQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'completed', 'cancelled']).optional(),
  type: z.enum(['dine-in', 'takeaway']).optional(),
  paymentStatus: z.enum(['unpaid', 'partial', 'paid', 'refunded']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ...page,
});
const dailySalesQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  password: z.string().optional(),
});

const auditQuery = z.object({
  user: objectId.optional(),
  entityType: z.string().trim().max(60).optional(),
  action: z.string().trim().max(80).optional(),
  ...page,
});

const login = z.object({
  email: z.string().trim().toLowerCase().min(1).max(120),
  password: z.string().min(1).max(200),
});
const createUser = z.object({
  name: z.string().trim().min(1).max(80),
  username: z.string().trim().toLowerCase().min(1).max(40).optional(),
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(6).max(100),
  role: z.enum(ROLES).optional().default('staff'),
  roles: z.array(z.enum(ROLES)).optional(),
  branch: z.string().trim().max(80).optional(),
});
const updateUser = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(ROLES).optional(),
  roles: z.array(z.enum(ROLES)).optional(),
  activeRole: z.enum(ROLES).optional().nullable(),
  branch: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(100).optional(),
}).refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field' });
const changePassword = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters').max(100),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirm password must match',
  path: ['confirmPassword'],
});
const taxSetting = z.object({ taxRate: z.number().min(0).max(100) });

const createCategory = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).optional().default(''),
  displayOrder: z.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});
const updateCategory = createCategory.partial().refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field' });

const createTable = z.object({
  code: z.string().trim().min(1).max(20),
  capacity: z.number().int().min(1).max(50).optional().default(4),
  section: z.string().trim().max(60).optional().default('Main'),
  location: z.string().trim().max(60).optional().default(''),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).optional(),
  notes: z.string().trim().max(200).optional().default(''),
});
const updateTable = createTable.partial().refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field' });
const tableStatus = z.object({ status: z.enum(['available', 'occupied', 'reserved', 'cleaning']) });

const couponBase = z.object({
  code: z.string().trim().min(1).max(30),
  description: z.string().trim().max(200).optional().default(''),
  discountType: z.enum(['percent', 'flat']),
  discountValue: z.number().finite().min(0).max(1_000_000),
  minOrderAmount: money.optional().default(0),
  maxUses: z.number().int().min(1).nullable().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});
const createCoupon = couponBase.refine((c) => c.discountType !== 'percent' || c.discountValue <= 100, {
  message: 'Percent discount must be 0-100', path: ['discountValue'],
});
const updateCoupon = couponBase.partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field' })
  .refine((c) => c.discountType !== 'percent' || c.discountValue === undefined || c.discountValue <= 100, {
    message: 'Percent discount must be 0-100', path: ['discountValue'],
  });
const validateCouponBody = z.object({
  code: z.string().trim().min(1).max(30),
  subtotal: money,
});

const kitchenItemStatus = z.object({
  itemId: objectId,
  prepStatus: z.enum(['pending', 'preparing', 'ready']),
});
const kitchenNotes = z.object({ kitchenNotes: z.string().trim().max(500).optional().default('') });

const startShift = z.object({
  openingCash: money.optional().default(0),
  notes: z.string().trim().max(500).optional().default(''),
});
const cashMovement = z.object({
  type: z.enum(['in', 'out']),
  amount: z.number().finite().positive().max(1_000_000).refine((n) => Math.round(n * 100) / 100 === n, 'Max 2 decimal places'),
  note: z.string().trim().max(200).optional().default(''),
});
const reconcileShift = z.object({
  actualCash: money.optional(),
  notes: z.string().trim().max(500).optional(),
});

module.exports = {
  objectId, idParam, createOrder, updateOrder, changeStatus, recordPayment, refundOrder, salesReturn,
  createMenu, updateMenu, availability, stockStatusUpdate, menuQuery, orderQuery, dailySalesQuery, auditQuery,
  login, createUser, updateUser, changePassword, taxSetting,
  createCategory, updateCategory, createTable, updateTable, tableStatus,
  createCoupon, updateCoupon, validateCouponBody, kitchenItemStatus, kitchenNotes,
  startShift, cashMovement, reconcileShift,
};

