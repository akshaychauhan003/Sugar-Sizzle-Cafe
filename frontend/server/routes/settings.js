const router = require('express').Router();
const Setting = require('../models/Setting');
const { getTaxRate } = require('../services/orderService');
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
router.use(authenticate);
router.get('/tax', asyncHandler(async (_req, res) => res.json({ taxRate: await getTaxRate() })));
router.put('/tax', requireRole('admin'), validate({ body: S.taxSetting }), asyncHandler(async (req, res) => {
  await Setting.findOneAndUpdate({ key: 'taxRate' }, { value: req.body.taxRate, updatedBy: req.user._id }, { upsert: true });
  res.json({ taxRate: req.body.taxRate });
}));
module.exports = router;
