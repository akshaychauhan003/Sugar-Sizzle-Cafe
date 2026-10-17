const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const User = require('../models/User');
const S = require('../lib/schemas');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { unauthorized, badRequest } = require('../lib/errors');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' } }),
});
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

router.post('/login', loginLimiter, validate({ body: S.login }), asyncHandler(async (req, res) => {
  const identifier = (req.body.email || req.body.username || '').trim().toLowerCase();
  const usernamePrefix = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }, { username: usernamePrefix }],
  }).select('+passwordHash');
  const password = req.body.password;
  const trimmedPassword = password ? password.trim() : '';
  const ok = (await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH)) ||
    (trimmedPassword !== password ? await bcrypt.compare(trimmedPassword, user?.passwordHash || DUMMY_HASH) : false);
  if (!user || !ok || !user.isActive) throw unauthorized('Invalid user ID or password', 'INVALID_CREDENTIALS');
  const activeRole = user.activeRole || user.role;
  const token = jwt.sign({ sub: String(user._id), role: activeRole }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });
  res.json({ token, user });
}));

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.post('/switch-role', authenticate, asyncHandler(async (req, res) => {
  const { role } = req.body || {};
  const { ROLES } = require('../lib/roles');
  if (!role || !ROLES.includes(role)) {
    throw badRequest(`Invalid role. Must be one of: ${ROLES.join(', ')}`);
  }

  const user = await User.findById(req.user._id);
  if (!user) throw unauthorized('User not found');

  const allowedRoles = (user.roles && user.roles.length) ? user.roles : [user.role];
  const isUserAdmin = user.role === 'admin' || allowedRoles.includes('admin');

  if (!isUserAdmin && !allowedRoles.includes(role)) {
    throw badRequest(`You do not have access to switch to the '${role}' role`);
  }

  user.activeRole = role;
  await user.save();

  const token = jwt.sign({ sub: String(user._id), role }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });
  res.json({ ok: true, role, token, user });
}));

router.put('/password', authenticate, validate({ body: S.changePassword }), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw unauthorized('User not found');

  if (currentPassword) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw badRequest('Current password is incorrect', null, 'INVALID_CURRENT_PASSWORD');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true, message: 'Password updated successfully' });
}));

/** Stateless JWT — logout is a client-side discard; endpoint exists for API symmetry. */
router.post('/logout', authenticate, (_req, res) => {
  res.json({ ok: true, message: 'Logged out' });
});

module.exports = router;
