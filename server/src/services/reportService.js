const Order = require('../models/Order');
const auditService = require('./auditService');
const { dayBounds, rangeBounds, todayStr, offsetString } = require('../lib/dates');
const { fromMinor } = require('../lib/money');

function getQueryBounds(input) {
  if (typeof input === 'object' && input !== null) {
    if (input.startDate || input.endDate) {
      const s = input.startDate || input.endDate || todayStr();
      const e = input.endDate || input.startDate || todayStr();
      return { ...rangeBounds(s, e), label: s === e ? s : `${s} to ${e}` };
    }
    const d = input.date || todayStr();
    return { ...dayBounds(d), label: d };
  }
  const d = input || todayStr();
  return { ...dayBounds(d), label: d };
}

/**
 * Daily sales definitions (documented in README):
 *  - totalOrders      : all orders created that day (incl. cancelled)
 *  - completedOrders  : status = completed
 *  - cancelledOrders  : status = cancelled
 *  - netSales         : sum of `total` of non-cancelled orders that are FULLY PAID
 *  - collections      : money actually recorded as payments on those orders' day, split by method
 */
async function dailySales(dateInput = todayStr()) {
  const { start, end, label } = getQueryBounds(dateInput);
  const inDay = { createdAt: { $gte: start, $lt: end } };
  const paidLive = { ...inDay, status: { $ne: 'cancelled' }, $expr: { $gte: ['$amountPaidMinor', '$totalMinor'] } };

  const [statusCounts, sales, byType, byMethod, hourly, topItems, recent, payCounts] = await Promise.all([
    Order.aggregate([{ $match: inDay }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: paidLive }, { $group: { _id: null, orders: { $sum: 1 }, net: { $sum: '$totalMinor' }, tax: { $sum: '$taxAmount' }, discount: { $sum: '$discountAmount' } } }]),
    Order.aggregate([{ $match: { ...inDay, status: { $ne: 'cancelled' } } }, { $group: { _id: '$type', orders: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...inDay, status: { $ne: 'cancelled' } } }, { $unwind: '$payments' },
      { $group: { _id: '$payments.method', amountMinor: { $sum: '$payments.amountMinor' }, payments: { $sum: 1 } } }]),
    Order.aggregate([{ $match: paidLive },
      { $group: { _id: { $hour: { date: '$createdAt', timezone: offsetString() } }, orders: { $sum: 1 }, revenueMinor: { $sum: '$totalMinor' } } },
      { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: { ...inDay, status: { $ne: 'cancelled' } } }, { $unwind: '$items' },
      { $group: { _id: '$items.name', quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { quantity: -1, revenue: -1 } }, { $limit: 5 }]),
    Order.find(inDay).sort({ createdAt: -1 }).limit(8),
    Order.aggregate([
      { $match: inDay },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$status', 'cancelled'] },
              'cancelled',
              {
                $cond: [
                  { $lte: ['$amountPaidMinor', 0] },
                  'unpaid',
                  { $cond: [{ $gte: ['$amountPaidMinor', '$totalMinor'] }, 'paid', 'partial'] },
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const s = sales[0] || { orders: 0, net: 0, tax: 0, discount: 0 };
  const netSales = fromMinor(s.net);
  const hourMap = new Map(hourly.map((h) => [h._id, h]));
  return {
    date: label,
    timezoneOffsetMinutes: require('../config/env').tzOffsetMinutes,
    totalOrders: Object.values(counts).reduce((a, b) => a + b, 0),
    completedOrders: counts.completed || 0,
    cancelledOrders: counts.cancelled || 0,
    activeOrders: (counts.pending || 0) + (counts.preparing || 0) + (counts.ready || 0),
    byStatus: { pending: counts.pending || 0, preparing: counts.preparing || 0, ready: counts.ready || 0, completed: counts.completed || 0, cancelled: counts.cancelled || 0 },
    netSales,
    paidOrders: s.orders,
    averageOrderValue: s.orders ? Math.round((netSales / s.orders) * 100) / 100 : 0,
    taxCollected: Math.round(s.tax * 100) / 100,
    discountsGiven: Math.round(s.discount * 100) / 100,
    byType: Object.fromEntries(byType.map((t) => [t._id, t.orders])),
    collections: Object.fromEntries(byMethod.map((m) => [m._id, { amount: fromMinor(m.amountMinor), payments: m.payments }])),
    byPaymentStatus: {
      unpaid: payCounts.find((p) => p._id === 'unpaid')?.count || 0,
      partial: payCounts.find((p) => p._id === 'partial')?.count || 0,
      paid: payCounts.find((p) => p._id === 'paid')?.count || 0,
      cancelled: payCounts.find((p) => p._id === 'cancelled')?.count || 0,
    },
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: hourMap.get(h)?.orders || 0, revenue: fromMinor(hourMap.get(h)?.revenueMinor || 0) })),
    topItems: topItems.map((t) => ({ name: t._id, quantity: t.quantity, revenue: Math.round(t.revenue * 100) / 100 })),
    recentOrders: recent,
  };
}

/** Alias used by summary-card endpoints. */
const salesSummary = dailySales;

async function paymentBreakdown(dateInput = todayStr()) {
  const report = await dailySales(dateInput);
  return {
    date: report.date,
    collections: report.collections,
    netSales: report.netSales,
    paidOrders: report.paidOrders,
  };
}

async function dineInVsTakeaway(dateInput = todayStr()) {
  const { start, end, label } = getQueryBounds(dateInput);
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: '$type',
        orders: { $sum: 1 },
        revenueMinor: {
          $sum: {
            $cond: [{ $gte: ['$amountPaidMinor', '$totalMinor'] }, '$totalMinor', 0],
          },
        },
      },
    },
  ]);
  const out = {
    date: label,
    'dine-in': { orders: 0, revenue: 0 },
    takeaway: { orders: 0, revenue: 0 },
  };
  for (const r of rows) {
    out[r._id] = { orders: r.orders, revenue: fromMinor(r.revenueMinor) };
  }
  return out;
}

async function completedHistory({ page = 1, limit = 20, date, startDate, endDate } = {}) {
  const filter = { status: 'completed' };
  if (date || startDate || endDate) {
    const { start, end } = getQueryBounds({ date, startDate, endDate });
    filter.completedAt = { $gte: start, $lt: end };
  }
  const [data, total] = await Promise.all([
    Order.find(filter).sort({ completedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function listAudit(opts) {
  return auditService.list(opts);
}

async function verifyPassword(user, password) {
  if (!password || !user) return false;
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  const u = await User.findById(user._id);
  if (!u) return false;
  return bcrypt.compare(password, u.passwordHash);
}

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function exportDailyCsv(dateInput = todayStr()) {
  const { start, end, label } = getQueryBounds(dateInput);
  const orders = await Order.find({ createdAt: { $gte: start, $lt: end } }).sort({ createdAt: 1 }).lean();
  const header = [
    'Order Number',
    'Date & Time',
    'Order Type',
    'Table',
    'Customer',
    'Order Status',
    'Payment Status',
    'Items Count',
    'Subtotal',
    'Discount',
    'Tax',
    'Total',
    'Amount Paid',
    'Total Refunded',
    'Net Sales',
  ];
  const rows = orders.map((o) => {
    const paid = (o.amountPaidMinor || 0) / 100;
    const refunded = (o.totalRefundedMinor || 0) / 100;
    const payStatus = o.amountPaidMinor <= 0
      ? (refunded > 0 ? 'refunded' : 'unpaid')
      : o.amountPaidMinor >= o.totalMinor
      ? 'paid'
      : 'partial';
    const itemsCount = (o.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    const netSales = Math.max(0, paid);

    return [
      o.orderNumber,
      o.createdAt?.toISOString?.() || o.createdAt,
      o.type,
      o.tableNumber || '',
      o.customerName || '',
      o.status,
      payStatus,
      itemsCount,
      o.subtotal,
      o.discountAmount,
      o.taxAmount,
      o.total,
      paid,
      refunded,
      netSales,
    ].map(csvEscape).join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

module.exports = {
  dailySales,
  salesSummary,
  paymentBreakdown,
  dineInVsTakeaway,
  completedHistory,
  listAudit,
  exportDailyCsv,
  verifyPassword,
};

