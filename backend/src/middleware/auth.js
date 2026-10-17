const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { unauthorized, forbidden } = require('../lib/errors');
const asyncHandler = require('../lib/asyncHandler');
const { ROLES, isManager, isCashierLike } = require('../lib/roles');

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }); }
  catch { throw unauthorized('Invalid or expired token', 'INVALID_TOKEN'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw unauthorized('Account is disabled or no longer exists', 'INVALID_TOKEN');

  const requestedRole = req.headers['x-active-role'];
  const userRoles = (user.roles && user.roles.length) ? user.roles : [user.role];
  if (requestedRole && (userRoles.includes(requestedRole) || user.role === 'admin' || userRoles.includes('admin'))) {
    user.role = requestedRole;
  } else if (user.activeRole && (userRoles.includes(user.activeRole) || userRoles.includes('admin'))) {
    user.role = user.activeRole;
  }

  req.user = user;
  next();
});

const requireRole = (...roles) => (req, _res, next) => {
  const currentRole = req.user?.role;
  const userRoles = req.user?.roles || [currentRole];
  if (roles.includes(currentRole) || userRoles.includes('admin') || userRoles.some((r) => roles.includes(r))) {
    return next();
  }
  return next(forbidden());
};

/** Alias with clearer name for multi-role checks. */
const requireAnyRole = (...roles) => requireRole(...roles);

module.exports = {
  authenticate,
  requireRole,
  requireAnyRole,
  ROLES,
  isManager,
  isCashierLike,
};
