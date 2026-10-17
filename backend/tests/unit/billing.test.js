const { computeBill } = require('../../src/services/billing');
const L = (unitPrice, quantity) => ({ unitPrice, quantity });

describe('computeBill', () => {
  test('subtotal, tax, total without discount', () => {
    const b = computeBill({ lines: [L(18.5, 2), L(7, 1)], taxRate: 5 });
    expect(b.subtotal).toBe(44); expect(b.taxAmount).toBe(2.2); expect(b.total).toBe(46.2); expect(b.discountAmount).toBe(0);
  });
  test('percent discount applied before tax', () => {
    const b = computeBill({ lines: [L(50, 2)], taxRate: 5, discount: { type: 'percent', value: 10 } });
    expect(b.discountAmount).toBe(10); expect(b.taxableAmount).toBe(90); expect(b.taxAmount).toBe(4.5); expect(b.total).toBe(94.5);
  });
  test('flat discount capped at subtotal', () => {
    const b = computeBill({ lines: [L(10, 1)], taxRate: 5, discount: { type: 'flat', value: 999 } });
    expect(b.discountAmount).toBe(10); expect(b.total).toBe(0);
  });
  test('recalculates when quantity changes', () => {
    expect(computeBill({ lines: [L(9.99, 1)], taxRate: 5 }).total).toBe(10.49);
    expect(computeBill({ lines: [L(9.99, 3)], taxRate: 5 }).total).toBe(31.47);
  });
  test('no floating-point drift (0.1+0.2 style)', () => {
    const b = computeBill({ lines: [L(0.1, 1), L(0.2, 1)], taxRate: 0 });
    expect(b.subtotal).toBe(0.3); expect(b.total).toBe(0.3);
  });
  test('zero tax is allowed; configurable rate', () => {
    expect(computeBill({ lines: [L(100, 1)], taxRate: 0 }).total).toBe(100);
    expect(computeBill({ lines: [L(100, 1)], taxRate: 18 }).total).toBe(118);
  });
  test('rejects bad input', () => {
    expect(() => computeBill({ lines: [], taxRate: 5 })).toThrow();
    expect(() => computeBill({ lines: [L(10, 0)], taxRate: 5 })).toThrow();
    expect(() => computeBill({ lines: [L(10, 1.5)], taxRate: 5 })).toThrow();
    expect(() => computeBill({ lines: [L(-1, 1)], taxRate: 5 })).toThrow();
    expect(() => computeBill({ lines: [L(10, 1)], taxRate: 101 })).toThrow();
    expect(() => computeBill({ lines: [L(10, 1)], taxRate: 5, discount: { type: 'percent', value: 150 } })).toThrow();
  });
});
