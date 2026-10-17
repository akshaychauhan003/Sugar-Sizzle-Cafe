const router = require('express').Router();
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const shiftService = require('../services/shiftService');
const Shift = require('../models/Shift');
const { notFound } = require('../lib/errors');
router.use(authenticate, requireAnyRole('admin', 'shift_manager', 'cashier', 'staff'));

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const page = Math.max(1, Number(req.query.page) || 1);
  const [data, total] = await Promise.all([
    Shift.find().sort({ openedAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('openedBy closedBy lockedBy', 'name role'),
    Shift.countDocuments(),
  ]);
  res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/history', asyncHandler(async (req, res) => {
  const data = await Shift.find({ status: 'locked' }).sort({ openedAt: -1 }).limit(30)
    .populate('openedBy closedBy lockedBy', 'name role');
  res.json({ data });
}));

router.post('/start', validate({ body: S.startShift }), asyncHandler(async (req, res) => {
  res.status(201).json({ shift: await shiftService.start(req.user, req.body) });
}));

router.get('/active', asyncHandler(async (_req, res) => {
  res.json({ shift: await shiftService.getActive() });
}));

router.get('/:id', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  const shift = await Shift.findById(req.params.id).populate('openedBy closedBy lockedBy', 'name role');
  if (!shift) throw notFound('Shift not found');
  res.json({ shift });
}));

router.post('/:id/cash-movement', validate({ params: S.idParam, body: S.cashMovement }), asyncHandler(async (req, res) => {
  res.json({ shift: await shiftService.addCashMovement(req.params.id, req.user, req.body) });
}));

router.post('/:id/reconcile', validate({ params: S.idParam, body: S.reconcileShift }), asyncHandler(async (req, res) => {
  res.json({ shift: await shiftService.reconcile(req.params.id, req.user, req.body) });
}));

router.post('/:id/lock', requireAnyRole('admin', 'shift_manager'), validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  res.json({ shift: await shiftService.lock(req.params.id, req.user) });
}));

module.exports = router;
