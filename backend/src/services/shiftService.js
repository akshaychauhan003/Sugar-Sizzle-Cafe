const Shift = require('../models/Shift');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const { todayStr, dayBounds } = require('../lib/dates');
const { notFound, conflict, badRequest } = require('../lib/errors');

async function nextShiftNumber() {
  const day = todayStr();
  const c = await Counter.findOneAndUpdate(
    { _id: `shift-${day}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `SH-${day.replace(/-/g, '')}-${String(c.seq).padStart(3, '0')}`;
}

async function getActive() {
  return Shift.findOne({ status: { $in: ['open', 'reconciling'] } }).sort({ openedAt: -1 })
    .populate('openedBy', 'name role')
    .populate('closedBy', 'name role');
}

async function start(user, { openingCash = 0, notes = '' } = {}) {
  const active = await getActive();
  if (active) throw conflict('A shift is already open', 'SHIFT_ALREADY_OPEN');
  const cash = Number(openingCash) || 0;
  if (cash < 0) throw badRequest('openingCash must be >= 0');
  return Shift.create({
    shiftNumber: await nextShiftNumber(),
    openedBy: user._id,
    openingCash: cash,
    expectedCash: cash,
    notes,
    status: 'open',
    openedAt: new Date(),
  });
}

async function addCashMovement(shiftId, user, { type, amount, note = '' }) {
  if (!['in', 'out'].includes(type)) throw badRequest('type must be in or out');
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) throw badRequest('amount must be a positive number');
  const shift = await Shift.findById(shiftId);
  if (!shift) throw notFound('Shift not found');
  if (shift.status === 'locked') throw conflict('Shift is locked', 'SHIFT_LOCKED');
  shift.cashMovements.push({ type, amount: amt, note, at: new Date(), by: user._id });
  const delta = type === 'in' ? amt : -amt;
  shift.expectedCash = Math.round((shift.expectedCash + delta) * 100) / 100;
  await shift.save();
  return shift;
}

async function collectTotalsSince(openedAt) {
  const { start } = dayBounds(todayStr());
  const from = openedAt || start;
  const rows = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: from },
        status: { $ne: 'cancelled' },
      },
    },
    { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: '$payments.method',
        amount: { $sum: '$payments.amount' },
      },
    },
  ]);
  const totals = { cash: 0, upi: 0, card: 0 };
  for (const r of rows) {
    if (totals[r._id] !== undefined) totals[r._id] = Math.round(r.amount * 100) / 100;
  }
  const orderCount = await Order.countDocuments({
    createdAt: { $gte: from },
    status: { $ne: 'cancelled' },
  });
  return { totals, orderCount };
}

async function reconcile(shiftId, user, { actualCash, notes } = {}) {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw notFound('Shift not found');
  if (shift.status === 'locked') throw conflict('Shift is locked', 'SHIFT_LOCKED');

  const { totals, orderCount } = await collectTotalsSince(shift.openedAt);
  shift.totals = totals;
  shift.orderCount = orderCount;

  const movementsNet = shift.cashMovements.reduce(
    (acc, m) => acc + (m.type === 'in' ? m.amount : -m.amount),
    0,
  );
  shift.expectedCash = Math.round((shift.openingCash + movementsNet + (totals.cash || 0)) * 100) / 100;

  if (actualCash !== undefined && actualCash !== null) {
    shift.actualCash = Number(actualCash);
    shift.cashVariance = Math.round((shift.actualCash - shift.expectedCash) * 100) / 100;
  }
  if (notes !== undefined) shift.notes = notes;
  shift.status = 'reconciling';
  shift.closedBy = user._id;
  shift.closedAt = new Date();
  await shift.save();
  return shift;
}

async function lock(shiftId, user) {
  const shift = await Shift.findById(shiftId);
  if (!shift) throw notFound('Shift not found');
  if (shift.status === 'locked') return shift;
  if (shift.status === 'open') {
    await reconcile(shiftId, user, {});
    return lock(shiftId, user);
  }
  shift.status = 'locked';
  shift.lockedAt = new Date();
  shift.lockedBy = user._id;
  if (!shift.closedAt) shift.closedAt = shift.lockedAt;
  if (!shift.closedBy) shift.closedBy = user._id;
  await shift.save();
  return shift;
}

module.exports = { start, getActive, addCashMovement, reconcile, lock, nextShiftNumber };
