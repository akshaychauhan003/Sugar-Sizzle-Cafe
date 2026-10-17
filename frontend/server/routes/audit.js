const router = require('express').Router();
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireAnyRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const auditService = require('../services/auditService');

router.use(authenticate, requireAnyRole('admin', 'shift_manager'));

router.get('/', validate({ query: S.auditQuery }), asyncHandler(async (req, res) => {
  const { page, limit, user, entityType, action } = req.query;
  res.json(await auditService.list({ page, limit, user, entityType, action }));
}));

module.exports = router;
