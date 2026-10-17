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
    res.json({ table: await tableService.setStatus(req.params.id, req.body.status) });
  }),
);

module.exports = router;
