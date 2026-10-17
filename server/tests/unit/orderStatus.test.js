const { canTransition, assertTransition } = require('../../src/services/orderStatus');

describe('order status transitions', () => {
  test('happy path pending -> preparing -> ready -> completed', () => {
    expect(canTransition('pending', 'preparing')).toBe(true);
    expect(canTransition('preparing', 'ready')).toBe(true);
    expect(canTransition('ready', 'completed')).toBe(true);
  });
  test.each([['pending', 'ready'], ['pending', 'completed'], ['preparing', 'completed'], ['completed', 'pending'], ['cancelled', 'preparing'], ['ready', 'preparing']])(
    'blocks %s -> %s', (from, to) => {
      expect(() => assertTransition({ from, to, role: 'admin', amountPaidMinor: 100, totalMinor: 100 })).toThrow(/Cannot move/);
    });
  test('completing requires full payment', () => {
    expect(() => assertTransition({ from: 'ready', to: 'completed', role: 'staff', amountPaidMinor: 50, totalMinor: 100 })).toThrow(/fully paid/);
    expect(() => assertTransition({ from: 'ready', to: 'completed', role: 'staff', amountPaidMinor: 100, totalMinor: 100 })).not.toThrow();
  });
  test('staff/cashier can cancel pending; admin/shift_manager after prep started', () => {
    expect(() => assertTransition({ from: 'pending', to: 'cancelled', role: 'staff' })).not.toThrow();
    expect(() => assertTransition({ from: 'pending', to: 'cancelled', role: 'cashier' })).not.toThrow();
    expect(() => assertTransition({ from: 'preparing', to: 'cancelled', role: 'staff' })).toThrow(/admin/);
    expect(() => assertTransition({ from: 'preparing', to: 'cancelled', role: 'cashier' })).toThrow(/admin/);
    expect(() => assertTransition({ from: 'preparing', to: 'cancelled', role: 'admin' })).not.toThrow();
    expect(() => assertTransition({ from: 'preparing', to: 'cancelled', role: 'shift_manager' })).not.toThrow();
  });
  test('kitchen may mark preparing -> ready only', () => {
    expect(() => assertTransition({ from: 'preparing', to: 'ready', role: 'kitchen' })).not.toThrow();
    expect(() => assertTransition({ from: 'pending', to: 'preparing', role: 'kitchen' })).toThrow(/Kitchen/);
    expect(() => assertTransition({ from: 'ready', to: 'completed', role: 'kitchen', amountPaidMinor: 100, totalMinor: 100 })).toThrow(/Kitchen/);
  });
  test('cannot cancel an order that has payments', () => {
    expect(() => assertTransition({ from: 'pending', to: 'cancelled', role: 'admin', amountPaidMinor: 10, totalMinor: 100 })).toThrow(/refund/i);
  });
});
