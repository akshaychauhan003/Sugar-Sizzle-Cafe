/** Role helpers. `staff` is a legacy alias kept for backward compatibility with existing clients/tests. */

const ROLES = ['admin', 'shift_manager', 'cashier', 'kitchen', 'staff'];

const normalize = (role) => (role === 'staff' ? 'cashier' : role);

const isAdmin = (userOrRole) => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'admin';
};

const isManager = (userOrRole) => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return ['admin', 'shift_manager'].includes(role);
};

/** Admin, shift manager, cashier, and legacy staff. */
const isCashierLike = (userOrRole) => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return ['admin', 'shift_manager', 'cashier', 'staff'].includes(role);
};

const isCashier = isCashierLike;

const isKitchen = (userOrRole) => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return ['admin', 'shift_manager', 'kitchen'].includes(role);
};

const ROLE_LABELS = {
  admin: 'Admin',
  shift_manager: 'Shift Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen Staff',
  staff: 'Staff',
};

module.exports = {
  ROLES, normalize, isAdmin, isManager, isCashier, isCashierLike, isKitchen, ROLE_LABELS,
};
