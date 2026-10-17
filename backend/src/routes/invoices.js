const { z } = require('zod');
const router = require('express').Router();
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const invoiceService = require('../services/invoiceService');

router.use(authenticate, requireAnyRole('admin', 'shift_manager', 'cashier', 'staff'));

router.get('/by-order/:orderId', validate({ params: z.object({ orderId: S.objectId }) }), asyncHandler(async (req, res) => {
  res.json({ invoice: await invoiceService.getByOrder(req.params.orderId) });
}));

router.post('/:id/reprint', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  res.json({ invoice: await invoiceService.reprint(req.params.id, req.user) });
}));

module.exports = router;
