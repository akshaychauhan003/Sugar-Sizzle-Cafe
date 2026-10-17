const router = require('express').Router();
const Stock = require('../models/Stock');
const Counter = require('../models/Counter');
const MenuItem = require('../models/MenuItem');
const { authenticate, requireAnyRole, requireRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { notFound, badRequest } = require('../lib/errors');
const { todayStr } = require('../lib/dates');
const stockService = require('../services/stockService');
const auditService = require('../services/auditService');

router.use(authenticate);

// List stocks (accessible by admin, shift_manager, kitchen, and cashier)
router.get('/', requireAnyRole('admin', 'shift_manager', 'kitchen', 'cashier', 'staff'), asyncHandler(async (req, res) => {
  const { category, status, expiringSoon } = req.query;
  const filter = {};

  if (category) filter.category = new RegExp(`^${category}$`, 'i');
  if (status) filter.status = status;

  if (expiringSoon === 'true') {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    filter.expiryDate = { $lte: futureDate };
  }

  const stocks = await Stock.find(filter)
    .sort({ expiryDate: 1, itemName: 1 })
    .populate('linkedMenuItemIds', 'name sku price stockStatus');

  const now = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const all = await Stock.find({});
  let expiringSoonCount = 0;
  let expiredCount = 0;
  let lowStockCount = 0;

  for (const item of all) {
    if (item.expiryDate < now) {
      expiredCount++;
    } else if (item.expiryDate <= weekFromNow) {
      expiringSoonCount++;
    }
    if (item.status === 'low_stock' || item.quantity <= 5) {
      lowStockCount++;
    }
  }

  res.json({
    data: stocks,
    stats: {
      totalBatches: all.length,
      expiringSoonCount,
      expiredCount,
      lowStockCount,
    },
  });
}));

// Expiring stocks summary
router.get('/expiring', requireAnyRole('admin', 'shift_manager', 'kitchen'), asyncHandler(async (_req, res) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const expiring = await Stock.find({ expiryDate: { $lte: futureDate } })
    .sort({ expiryDate: 1 })
    .populate('linkedMenuItemIds', 'name sku price stockStatus');

  res.json({ data: expiring });
}));

// Stock alerts (low stock, expiring within N days, expired)
router.get('/alerts', requireAnyRole('admin', 'shift_manager', 'kitchen', 'cashier'), asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 3;
  const alerts = await stockService.getStockAlerts(days);
  res.json({ data: alerts });
}));

// Recalculate menu items availability based on stock levels
router.post('/recalculate-availability', requireAnyRole('admin', 'shift_manager', 'kitchen'), asyncHandler(async (_req, res) => {
  await stockService.recalculateDishAvailability();
  res.json({ ok: true, message: 'Dish availability recalculated successfully' });
}));

// Add new stock batch (Admin, Shift Manager, Kitchen Chef)
router.post('/', requireAnyRole('admin', 'shift_manager', 'kitchen'), asyncHandler(async (req, res) => {
  const { itemName, category, quantity, unit, costPrice, batchNumber, supplier, purchaseDate, expiryDate, notes, minimumQuantity, linkedMenuItemIds } = req.body;

  if (!itemName || !itemName.trim()) {
    throw badRequest('Item name is required');
  }
  if (!expiryDate) {
    throw badRequest('Expiry date is required');
  }
  if (quantity === undefined || quantity < 0) {
    throw badRequest('Valid quantity is required');
  }

  let finalBatchNumber = batchNumber;
  if (!finalBatchNumber || !finalBatchNumber.trim()) {
    const day = todayStr();
    const c = await Counter.findOneAndUpdate(
      { _id: `stock-${day}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    finalBatchNumber = `STK-${day.replace(/-/g, '')}-${String(c.seq).padStart(3, '0')}`;
  }

  const expDateObj = new Date(expiryDate);
  const now = new Date();
  let status = 'in_stock';
  if (expDateObj < now) {
    status = 'expired';
  } else if (quantity === 0) {
    status = 'out_of_stock';
  } else if (quantity <= (Number(minimumQuantity) || 5)) {
    status = 'low_stock';
  }

  const stock = await Stock.create({
    itemName: itemName.trim(),
    category: category ? category.trim() : 'General',
    quantity: Number(quantity),
    unit: unit ? unit.trim() : 'kg',
    costPrice: costPrice ? Number(costPrice) : 0,
    batchNumber: finalBatchNumber,
    supplier: supplier ? supplier.trim() : 'Local Supplier',
    purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    expiryDate: expDateObj,
    minimumQuantity: minimumQuantity !== undefined ? Number(minimumQuantity) : 5,
    notes: notes ? notes.trim() : '',
    status,
    linkedMenuItemIds: linkedMenuItemIds || [],
    createdBy: req.user._id,
  });

  await stockService.recalculateDishAvailability();
  await auditService.log(
    req.user,
    'stock.add',
    'Stock',
    stock._id,
    `Added stock batch ${stock.batchNumber} (${stock.itemName}, ${stock.quantity} ${stock.unit})`,
    { stockId: stock._id, batchNumber: stock.batchNumber, quantity: stock.quantity }
  );

  res.status(201).json({ stock });
}));

// Record stock wastage / spoilage (Chef, Shift Manager, Admin)
router.post('/:id/waste', requireAnyRole('admin', 'shift_manager', 'kitchen'), asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  if (!quantity || Number(quantity) <= 0) {
    throw badRequest('Valid wastage quantity is required');
  }
  const stock = await stockService.recordStockWastage({
    stockId: req.params.id,
    quantity: Number(quantity),
    reason: reason || 'Expired / Damaged',
    user: req.user,
  });
  res.json({ ok: true, stock });
}));

// Request stock replenishment (Chef, Staff -> alerts Manager/Admin)
router.post('/:id/request-replenish', requireAnyRole('admin', 'shift_manager', 'kitchen', 'staff'), asyncHandler(async (req, res) => {
  const stock = await Stock.findById(req.params.id);
  if (!stock) throw notFound('Stock item not found');

  await auditService.log(
    req.user,
    'stock.request_replenish',
    'Stock',
    stock._id,
    `Replenishment requested for ${stock.itemName} (Available: ${stock.quantity} ${stock.unit})`,
    { stockId: stock._id, itemName: stock.itemName, currentQty: stock.quantity, requestedBy: req.user._id }
  );

  res.json({ ok: true, message: `Replenishment request submitted for ${stock.itemName}` });
}));

// Update stock (Admin, Shift Manager, Kitchen Chef)
router.patch('/:id', requireAnyRole('admin', 'shift_manager', 'kitchen'), asyncHandler(async (req, res) => {
  const { quantity, status, expiryDate, notes, supplier, costPrice, unit, category, itemName, minimumQuantity } = req.body;
  const update = {};

  if (itemName !== undefined) update.itemName = itemName.trim();
  if (category !== undefined) update.category = category.trim();
  if (unit !== undefined) update.unit = unit.trim();
  if (costPrice !== undefined) update.costPrice = Number(costPrice);
  if (supplier !== undefined) update.supplier = supplier.trim();
  if (notes !== undefined) update.notes = notes.trim();
  if (minimumQuantity !== undefined) update.minimumQuantity = Number(minimumQuantity);

  if (quantity !== undefined) {
    update.quantity = Number(quantity);
    const minQty = update.minimumQuantity !== undefined ? update.minimumQuantity : 5;
    if (update.quantity === 0) {
      update.status = 'out_of_stock';
    } else if (update.quantity <= minQty && (!status || status === 'in_stock')) {
      update.status = 'low_stock';
    }
  }

  if (expiryDate) {
    update.expiryDate = new Date(expiryDate);
    if (update.expiryDate < new Date()) {
      update.status = 'expired';
    }
  }

  if (status && !update.status) update.status = status;

  const stock = await Stock.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!stock) throw notFound('Stock batch not found');

  await stockService.recalculateDishAvailability();
  await auditService.log(
    req.user,
    'stock.update',
    'Stock',
    stock._id,
    `Updated stock ${stock.itemName} (Qty: ${stock.quantity} ${stock.unit})`,
    { stockId: stock._id, updates: update }
  );

  res.json({ stock });
}));

// Delete stock batch (Admin only)
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const stock = await Stock.findByIdAndDelete(req.params.id);
  if (!stock) throw notFound('Stock batch not found');
  await stockService.recalculateDishAvailability();
  await auditService.log(
    req.user,
    'stock.delete',
    'Stock',
    stock._id,
    `Deleted stock batch ${stock.batchNumber} (${stock.itemName})`,
    { stockId: stock._id, batchNumber: stock.batchNumber }
  );
  res.json({ ok: true, message: 'Stock batch deleted' });
}));

module.exports = router;
