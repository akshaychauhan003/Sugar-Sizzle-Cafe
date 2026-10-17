const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { notFound } = require('../lib/errors');

const adminOnly = requireRole('admin');
const SORTS = {
  name: { name: 1 }, '-name': { name: -1 }, price: { price: 1 }, '-price': { price: -1 },
  category: { category: 1, name: 1 }, '-createdAt': { createdAt: -1 },
};
router.use(authenticate);

router.get('/', validate({ query: S.menuQuery }), asyncHandler(async (req, res) => {
  const { q, category, available, includeInactive, sort, page, limit } = req.query;
  const filter = {};
  if (!(includeInactive && req.user.role === 'admin')) filter.isActive = true;
  if (category) filter.category = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (available !== undefined) filter.isAvailable = available;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { description: rx }];
  }
  const qfind = MenuItem.find(filter).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit);
  if (req.user.role === 'admin') qfind.select('+cost');
  const [data, total] = await Promise.all([qfind, MenuItem.countDocuments(filter)]);
  res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/categories', asyncHandler(async (_req, res) => {
  const fromCollection = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();
  if (fromCollection.length) {
    return res.json({ data: fromCollection.map((c) => c.name), categories: fromCollection });
  }
  res.json({ data: (await MenuItem.distinct('category', { isActive: true })).sort() });
}));

router.get('/export.csv', adminOnly, asyncHandler(async (_req, res) => {
  const items = await MenuItem.find().select('+cost').sort({ category: 1, name: 1 }).lean();
  const header = ['sku', 'name', 'category', 'price', 'cost', 'stockStatus', 'isAvailable', 'isActive', 'prepTimeMin'];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = items.map((i) => header.map((h) => esc(i[h])).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="menu-export.csv"');
  res.send(csv);
}));

router.get('/:id', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const q = MenuItem.findById(req.params.id);
  if (req.user.role === 'admin') q.select('+cost');
  const item = await q;
  if (!item || (!item.isActive && req.user.role !== 'admin')) throw notFound('Menu item not found');
  res.json({ item });
}));

router.post('/', adminOnly, validate({ body: S.createMenu }), asyncHandler(async (req, res) => {
  res.status(201).json({ item: await MenuItem.create(req.body) });
}));

router.put('/:id', adminOnly, validate({ params: S.idParam, body: S.updateMenu }), asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('+cost');
  if (!item) throw notFound('Menu item not found');
  res.json({ item });
}));

router.patch('/:id/availability', validate({ params: S.idParam, body: S.availability }), asyncHandler(async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    {
      isAvailable: req.body.isAvailable,
      stockStatus: req.body.isAvailable ? 'in_stock' : 'out_of_stock',
    },
    { new: true },
  );
  if (!item) throw notFound('Menu item not found');
  res.json({ item });
}));

router.patch('/:id/stock-status', validate({ params: S.idParam, body: S.stockStatusUpdate }), asyncHandler(async (req, res) => {
  const { stockStatus, inventoryQuantity, isAvailable } = req.body;
  const update = { stockStatus };
  if (inventoryQuantity !== undefined) update.inventoryQuantity = inventoryQuantity;
  if (isAvailable !== undefined) {
    update.isAvailable = isAvailable;
  } else {
    update.isAvailable = stockStatus !== 'out_of_stock';
  }
  const item = await MenuItem.findOneAndUpdate(
    { _id: req.params.id, isActive: true },
    { $set: update },
    { new: true },
  );
  if (!item) throw notFound('Menu item not found');
  res.json({ item });
}));

router.post('/:id/image', adminOnly, validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const { imageUrl, imageData } = req.body || {};
  let targetUrl = imageUrl;
  if (imageData) {
    if (typeof imageData !== 'string' || imageData.length > 500000) {
      throw badRequest('Image payload exceeds 500KB size limit');
    }
    if (!imageData.startsWith('data:image/')) {
      throw badRequest('Image must be a valid data URI');
    }
    targetUrl = imageData;
  }
  if (!targetUrl) throw badRequest('imageUrl or imageData is required');
  const item = await MenuItem.findByIdAndUpdate(req.params.id, { imageUrl: targetUrl }, { new: true });
  if (!item) throw notFound('Menu item not found');
  res.json({ item });
}));

router.delete('/:id', adminOnly, validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, { isActive: false, isAvailable: false, stockStatus: 'out_of_stock' }, { new: true });
  if (!item) throw notFound('Menu item not found');
  res.json({ item });
}));

module.exports = router;
