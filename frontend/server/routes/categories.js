const router = require('express').Router();
const Category = require('../models/Category');
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { notFound, conflict } = require('../lib/errors');

router.use(authenticate);
const adminOnly = requireRole('admin');

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ data: await Category.find().sort({ displayOrder: 1, name: 1 }) });
}));

router.get('/:id', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw notFound('Category not found');
  res.json({ category });
}));

router.post('/', adminOnly, validate({ body: S.createCategory }), asyncHandler(async (req, res) => {
  try {
    res.status(201).json({ category: await Category.create(req.body) });
  } catch (e) {
    if (e.code === 11000) throw conflict('Category name already exists', 'DUPLICATE_CATEGORY');
    throw e;
  }
}));

router.patch('/:id', adminOnly, validate({ params: S.idParam, body: S.updateCategory }), asyncHandler(async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) throw notFound('Category not found');
    res.json({ category });
  } catch (e) {
    if (e.code === 11000) throw conflict('Category name already exists', 'DUPLICATE_CATEGORY');
    throw e;
  }
}));

router.delete('/:id', adminOnly, validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) throw notFound('Category not found');
  res.json({ category });
}));

module.exports = router;
