const Coupon = require('../models/Coupon');
const { toMinor, fromMinor, roundPct } = require('../lib/money');
const { badRequest, notFound } = require('../lib/errors');

function discountAmountFor(coupon, subtotal) {
  const subtotalM = toMinor(subtotal);
  let discountM = 0;
  if (coupon.discountType === 'percent') {
    discountM = roundPct(subtotalM, coupon.discountValue);
  } else {
    discountM = toMinor(coupon.discountValue);
  }
  discountM = Math.min(discountM, subtotalM);
  return fromMinor(discountM);
}

/**
 * Validate a coupon against a subtotal. Returns coupon fields + computed discountAmount.
 */
async function validateCoupon(code, subtotal) {
  if (!code || typeof code !== 'string') throw badRequest('Coupon code is required');
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) throw notFound('Coupon not found', 'COUPON_NOT_FOUND');
  if (!coupon.isActive) throw badRequest('Coupon is inactive', undefined, 'COUPON_INACTIVE');
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    throw badRequest('Coupon is not yet valid', undefined, 'COUPON_NOT_STARTED');
  }
  if (coupon.validTo && now > coupon.validTo) {
    throw badRequest('Coupon has expired', undefined, 'COUPON_EXPIRED');
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw badRequest('Coupon usage limit reached', undefined, 'COUPON_EXHAUSTED');
  }
  const sub = Number(subtotal) || 0;
  if (sub < (coupon.minOrderAmount || 0)) {
    throw badRequest(
      `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
      undefined,
      'COUPON_MIN_ORDER',
    );
  }
  const discountAmount = discountAmountFor(coupon, sub);
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    coupon,
  };
}

/** Convert a validated coupon into a billing discount input. */
function toDiscountInput(validated) {
  return { type: validated.discountType, value: validated.discountValue };
}

async function incrementUse(code) {
  if (!code) return;
  await Coupon.updateOne({ code: String(code).toUpperCase() }, { $inc: { usedCount: 1 } });
}

module.exports = { validateCoupon, toDiscountInput, discountAmountFor, incrementUse };
