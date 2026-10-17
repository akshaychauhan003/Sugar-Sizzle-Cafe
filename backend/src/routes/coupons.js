const router = require('express').Router();
const Coupon = require('../models/Coupon');
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { notFound, conflict } = require('../lib/errors');
const couponService = require('../services/couponService');

router.use(authenticate);

router.get('/', requireAnyRole('admin', 'shift_manager'), asyncHandler(async (_req, res) => {
  res.json({ data: await Coupon.find().sort({ createdAt: -1 }) });
}));

router.post('/validate', requireAnyRole('admin', 'shift_manager', 'cashier', 'staff'),
  validate({ body: S.validateCouponBody }),
  asyncHandler(async (req, res) => {
    const result = await couponService.validateCoupon(req.body.code, req.body.subtotal);
    res.json({
      valid: true,
      code: result.code,
      discountType: result.discountType,
      discountValue: result.discountValue,
      discountAmount: result.discountAmount,
    });
  }));

router.post('/', requireRole('admin'), validate({ body: S.createCoupon }), asyncHandler(async (req, res) => {
  try {
    const body = { ...req.body, code: String(req.body.code).toUpperCase() };
    res.status(201).json({ coupon: await Coupon.create(body) });
  } catch (e) {
    if (e.code === 11000) throw conflict('Coupon code already exists', 'DUPLICATE_COUPON');
    throw e;
  }
}));

router.patch('/:id', requireRole('admin'), validate({ params: S.idParam, body: S.updateCoupon }), asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.code) body.code = String(body.code).toUpperCase();
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!coupon) throw notFound('Coupon not found');
    res.json({ coupon });
  } catch (e) {
    if (e.code === 11000) throw conflict('Coupon code already exists', 'DUPLICATE_COUPON');
    throw e;
  }
}));

module.exports = router;
