const { conflict, forbidden } = require('../lib/errors');
const { isManager, isCashierLike, isKitchen } = require('../lib/roles');

const STATUSES = ['pending', 'preparing', 'ready', 'delivered', 'completed', 'cancelled'];
const TRANSITIONS = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

/** Throws if the move is not allowed for this order/user. */
function assertTransition({ from, to, role, amountPaidMinor = 0, totalMinor = 0 }) {
  if (!canTransition(from, to)) {
    if (to === 'preparing' && ['preparing', 'ready', 'delivered', 'completed'].includes(from)) {
      throw conflict(`Cannot move order from '${from}' to '${to}': Order has already been confirmed`, 'ORDER_ALREADY_CONFIRMED');
    }
    throw conflict(`Cannot move order from '${from}' to '${to}'`, 'INVALID_STATUS_TRANSITION', { allowed: TRANSITIONS[from] || [] });
  }

  // Kitchen staff may advance preparing -> ready; other status changes require cashier-like or manager.
  if (role === 'kitchen') {
    if (!(from === 'preparing' && to === 'ready')) {
      throw forbidden('Kitchen staff may only mark preparing orders as ready');
    }
  } else if (to === 'ready' && from === 'preparing') {
    // Cashiers, staff, managers, and kitchen (handled above) can mark ready.
    if (!isCashierLike(role) && !isKitchen(role)) {
      throw forbidden('You do not have permission to mark orders ready');
    }
  } else if (to === 'delivered') {
    if (!isCashierLike(role)) {
      throw forbidden('You do not have permission to mark orders delivered');
    }
  }

  if (to === 'cancelled') {
    if (from !== 'pending') {
      if (!isManager(role)) {
        throw forbidden('Only an admin or shift manager can cancel an order that is already being prepared');
      }
    } else if (!isCashierLike(role) && !isManager(role)) {
      throw forbidden('You do not have permission to cancel this order');
    }
    if (amountPaidMinor > 0) {
      throw conflict('Order has recorded payments; refunds are not supported, so it cannot be cancelled', 'CANCEL_REQUIRES_REFUND');
    }
  }

  if (to === 'completed' && amountPaidMinor < totalMinor) {
    throw conflict('Order must be fully paid before it can be completed', 'PAYMENT_REQUIRED');
  }
}

module.exports = { STATUSES, TRANSITIONS, canTransition, assertTransition };
