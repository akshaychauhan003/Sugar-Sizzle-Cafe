const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { notFound, conflict } = require('../lib/errors');

router.use(authenticate, requireRole('admin'));

router.get('/', asyncHandler(async (_req, res) => res.json({ data: await User.find().sort({ createdAt: -1 }) })));

router.post('/', validate({ body: S.createUser }), asyncHandler(async (req, res) => {
  const { password, roles, role, ...rest } = req.body;
  const assignedRoles = (roles && roles.length) ? [...new Set(roles)] : [role || 'staff'];
  const primaryRole = assignedRoles[0];
  const user = await User.create({
    ...rest,
    role: primaryRole,
    roles: assignedRoles,
    passwordHash: await bcrypt.hash(password, 10),
  });
  res.status(201).json({ user });
}));

router.patch('/:id', validate({ params: S.idParam, body: S.updateUser }), asyncHandler(async (req, res) => {
  const { password, roles, role, ...rest } = req.body;
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw notFound('User not found');

  if (String(req.user._id) === req.params.id) {
    if (rest.isActive === false) throw conflict('You cannot disable your own account', 'SELF_MODIFICATION');
    if (role && role !== 'admin') throw conflict('You cannot demote your own account', 'SELF_MODIFICATION');
    if (roles && !roles.includes('admin')) throw conflict('You cannot remove your own admin privileges', 'SELF_MODIFICATION');
  }

  const update = { ...rest };
  if (roles && roles.length) {
    update.roles = [...new Set(roles)];
    if (!update.role) update.role = update.roles[0];
  } else if (role) {
    update.role = role;
    if (!update.roles) update.roles = [role];
  }

  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  res.json({ user });
}));

router.delete('/:id', validate({ params: S.idParam }), asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    throw conflict('You cannot delete your own account', 'SELF_MODIFICATION');
  }
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) throw notFound('User not found');
  res.json({ ok: true, message: 'User deactivated successfully', user });
}));

module.exports = router;
