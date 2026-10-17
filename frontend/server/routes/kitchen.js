const router = require('express').Router();
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const kitchenService = require('../services/kitchenService');

router.use(authenticate, requireAnyRole('admin', 'shift_manager', 'kitchen', 'cashier', 'staff'));

router.get('/tickets', asyncHandler(async (_req, res) => {
  res.json({ data: await kitchenService.listActive() });
}));

router.patch('/tickets/:id/items', validate({ params: S.idParam, body: S.kitchenItemStatus }), asyncHandler(async (req, res) => {
  const ticket = await kitchenService.updateItemStatus(
    req.params.id,
    req.body.itemId,
    req.body.prepStatus,
    req.user,
  );
  res.json({ ticket });
}));

router.patch('/tickets/:id/notes', validate({ params: S.idParam, body: S.kitchenNotes }), asyncHandler(async (req, res) => {
  res.json({ ticket: await kitchenService.addNotes(req.params.id, req.body.kitchenNotes, req.user) });
}));

router.post('/tickets/:id/ready', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  res.json({ ticket: await kitchenService.markReady(req.params.id, req.user) });
}));

module.exports = router;
