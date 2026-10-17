const router = require('express').Router();
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const tableService = require('../services/tableService');

router.use(authenticate);
const managerWrite = requireAnyRole('admin', 'shift_manager');

router.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await tableService.list({ status: req.query.status, section: req.query.section }) });
}));

router.post('/', managerWrite, validate({ body: S.createTable }), asyncHandler(async (req, res) => {
  res.status(201).json({ table: await tableService.create(req.body) });
}));

router.patch('/:id', managerWrite, validate({ params: S.idParam, body: S.updateTable }), asyncHandler(async (req, res) => {
  res.json({ table: await tableService.update(req.params.id, req.body) });
}));

router.patch(
  '/:id/status',
  requireAnyRole('admin', 'shift_manager', 'cashier', 'staff'),
  validate({ params: S.idParam, body: S.tableStatus }),
  asyncHandler(async (req, res) => {
    res.json({ table: await tableService.setStatus(req.params.id, req.body.status, req.user) });
  }),
);

// Waitstaff confirms that customer has eaten and left restaurant -> status: 'cleaning'
router.post(
  '/:id/customer-left',
  requireAnyRole('admin', 'shift_manager', 'cashier', 'staff'),
  validate({ params: S.idParam }),
  asyncHandler(async (req, res) => {
    res.json({ table: await tableService.markCustomerLeft(req.params.id, req.user) });
  }),
);

// Waitstaff confirms that table is cleaned & sanitized -> status: 'available' (shows to cashier)
router.post(
  '/:id/cleaned',
  requireAnyRole('admin', 'shift_manager', 'cashier', 'staff'),
  validate({ params: S.idParam }),
  asyncHandler(async (req, res) => {
    res.json({ table: await tableService.markCleaned(req.params.id, req.user) });
  }),
);

module.exports = router;
