const S = require('../../src/lib/schemas');
const id = '507f1f77bcf86cd799439011';

describe('request schemas', () => {
  test('client-supplied totals/prices are stripped', () => {
    const r = S.createOrder.parse({ type: 'takeaway', items: [{ menuItemId: id, quantity: 2, price: 0.01 }], total: 1, subtotal: 1 });
    expect(r.total).toBeUndefined(); expect(r.items[0].price).toBeUndefined();
  });
  test('dine-in requires table number', () => {
    expect(() => S.createOrder.parse({ type: 'dine-in', items: [{ menuItemId: id, quantity: 1 }] })).toThrow();
    expect(S.createOrder.parse({ type: 'dine-in', tableNumber: 'T-04', items: [{ menuItemId: id, quantity: 1 }] })).toBeTruthy();
  });
  test('rejects bad quantity / id / empty items', () => {
    expect(() => S.createOrder.parse({ type: 'takeaway', items: [] })).toThrow();
    expect(() => S.createOrder.parse({ type: 'takeaway', items: [{ menuItemId: 'x', quantity: 1 }] })).toThrow();
    expect(() => S.createOrder.parse({ type: 'takeaway', items: [{ menuItemId: id, quantity: 0 }] })).toThrow();
  });
  test('menu price validation', () => {
    expect(() => S.createMenu.parse({ name: 'A', category: 'B', price: -1 })).toThrow();
    expect(() => S.createMenu.parse({ name: 'A', category: 'B', price: 1.234 })).toThrow();
    expect(S.createMenu.parse({ name: 'A', category: 'B', price: 12.5 }).price).toBe(12.5);
  });
  test('payment method restricted', () => {
    expect(() => S.recordPayment.parse({ method: 'bitcoin' })).toThrow();
    expect(S.recordPayment.parse({ method: 'upi' }).method).toBe('upi');
  });

  test('changePassword validation - requires matching new and confirm passwords with min 8 chars', () => {
    // Valid: matching passwords >= 8 chars
    const valid = S.changePassword.parse({
      newPassword: 'StrongPassword123',
      confirmPassword: 'StrongPassword123',
    });
    expect(valid.newPassword).toBe('StrongPassword123');
    expect(valid.confirmPassword).toBe('StrongPassword123');

    // Mismatched passwords throw
    expect(() => S.changePassword.parse({
      newPassword: 'StrongPassword123',
      confirmPassword: 'DifferentPassword123',
    })).toThrow();

    // Less than 8 chars throws
    expect(() => S.changePassword.parse({
      newPassword: 'short',
      confirmPassword: 'short',
    })).toThrow();
  });

  test('createUser and updateUser support multiple roles array', () => {
    const created = S.createUser.parse({
      name: 'Chef Maya',
      email: 'maya@restoflow.test',
      password: 'ChefPassword123',
      roles: ['kitchen', 'cashier', 'staff'],
    });
    expect(created.roles).toEqual(['kitchen', 'cashier', 'staff']);

    const updated = S.updateUser.parse({
      roles: ['admin', 'kitchen'],
      activeRole: 'kitchen',
    });
    expect(updated.roles).toEqual(['admin', 'kitchen']);
    expect(updated.activeRole).toBe('kitchen');
  });
});
