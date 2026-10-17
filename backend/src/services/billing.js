const { toMinor, fromMinor, roundPct } = require('../lib/money');
const { badRequest } = require('../lib/errors');

/**
 * Authoritative bill calculation (pure function).
 *   subtotal = sum(unitPrice * qty)
 *   discount = percent of subtotal | flat amount, capped at subtotal
 *   optional extraDiscountMinor (e.g. coupon stacked on manual discount)
 *   tax      = (subtotal - discount) * taxRate%      (tax is exclusive, applied AFTER discount)
 *   total    = subtotal - discount + tax
 */
function computeBill({ lines, taxRate, discount, extraDiscountMinor = 0 }) {
  if (!Array.isArray(lines) || lines.length === 0) throw badRequest('Order must contain at least one item');
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw badRequest('Invalid tax rate');

  let subtotalM = 0;
  const computedLines = lines.map((l) => {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 99) throw badRequest('Quantity must be an integer between 1 and 99');
    if (!Number.isFinite(l.unitPrice) || l.unitPrice < 0) throw badRequest('Invalid unit price');
    const lineM = toMinor(l.unitPrice) * l.quantity;
    subtotalM += lineM;
    return { ...l, lineTotal: fromMinor(lineM) };
  });

  let discountM = 0;
  if (discount && discount.value > 0) {
    if (discount.type === 'percent') {
      if (discount.value > 100) throw badRequest('Percentage discount cannot exceed 100');
      discountM = roundPct(subtotalM, discount.value);
    } else if (discount.type === 'flat') {
      discountM = toMinor(discount.value);
    } else throw badRequest('Unknown discount type');
  }

  const extraM = Math.max(0, Math.round(Number(extraDiscountMinor) || 0));
  discountM = Math.min(discountM + extraM, subtotalM);

  const taxableM = subtotalM - discountM;
  const taxM = roundPct(taxableM, taxRate);
  const totalM = taxableM + taxM;

  return {
    lines: computedLines,
    subtotal: fromMinor(subtotalM),
    discountAmount: fromMinor(discountM),
    taxableAmount: fromMinor(taxableM),
    taxRate,
    taxAmount: fromMinor(taxM),
    total: fromMinor(totalM),
    subtotalMinor: subtotalM,
    discountMinor: discountM,
    extraDiscountMinor: extraM,
    totalMinor: totalM,
  };
}

module.exports = { computeBill };
