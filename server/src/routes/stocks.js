const router = require('express').Router();
const Stock = require('../models/Stock');
const Counter = require('../models/Counter');
const MenuItem = require('../models/MenuItem');
const { authenticate, requireAnyRole, requireRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { notFound, badRequest } = require('../lib/errors');
const { todayStr } = require('../lib/dates');

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

// Add new stock batch (Admin, Shift Manager, Kitchen Chef)
router.post('/', requireAnyRole('admin', 'shift_manager', 'kitchen'), asyncHandler(async (req, res) => {
  const { itemName, category, quantity, unit, costPrice, batchNumber, supplier, purchaseDate, expiryDate, notes, linkedMenuItemIds } = req.body;

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
  } else if (quantity <= 5) {
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
    notes: notes ? notes.trim() : '',
    status,
    linkedMenuItemIds: linkedMenuItemIds || [],
    createdBy: req.user._id,
  });

  res.status(201).json({ stock });
}));

// Update stock (Admin, Shift Manager, Kitchen Chef)
router.patch('/:id', requireAnyRole('admin', 'shift_manager', 'kitchen'), asyncHandler(async (req, res) => {
  const { quantity, status, expiryDate, notes, supplier, costPrice, unit, category, itemName } = req.body;
  const update = {};

  if (itemName !== undefined) update.itemName = itemName.trim();
  if (category !== undefined) update.category = category.trim();
  if (unit !== undefined) update.unit = unit.trim();
  if (costPrice !== undefined) update.costPrice = Number(costPrice);
  if (supplier !== undefined) update.supplier = supplier.trim();
  if (notes !== undefined) update.notes = notes.trim();

  if (quantity !== undefined) {
    update.quantity = Number(quantity);
    if (update.quantity === 0) {
      update.status = 'out_of_stock';
    } else if (update.quantity <= 5 && (!status || status === 'in_stock')) {
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

  res.json({ stock });
}));

// Delete stock batch (Admin only)
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const stock = await Stock.findByIdAndDelete(req.params.id);
  if (!stock) throw notFound('Stock batch not found');
  res.json({ ok: true, message: 'Stock batch deleted' });
}));

module.exports = router;
