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
    Order.find(inDay).sort({ createdAt: -1 }).limit(50),
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
  const u = await User.findById(user._id).select('+passwordHash');
  if (!u || !u.passwordHash) return false;
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

async function employeePerformance(dateInput = todayStr()) {
  const { start, end, label } = getQueryBounds(dateInput);
  const User = require('../models/User');
  const KitchenTicket = require('../models/KitchenTicket');

  const users = await User.find({ isActive: true }).select('name email role roles').lean();
  const inRange = { createdAt: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } };

  // 1. Orders taken by Cashier / Creator
  const createdCounts = await Order.aggregate([
    { $match: inRange },
    { $group: { _id: '$createdBy', count: { $sum: 1 }, totalRevenue: { $sum: '$total' } } },
  ]);
  const createdMap = new Map(createdCounts.map((c) => [String(c._id), c]));

  // 2. Orders cooked by Chef (preparedBy or KitchenTicket assignedTo)
  const preparedCounts = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, preparedBy: { $ne: null } } },
    { $group: { _id: '$preparedBy', count: { $sum: 1 } } },
  ]);
  const prepMap = new Map(preparedCounts.map((c) => [String(c._id), c.count]));

  const ticketCounts = await KitchenTicket.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, assignedTo: { $ne: null } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);
  const ticketMap = new Map(ticketCounts.map((c) => [String(c._id), c.count]));

  // 3. Orders delivered by Staff (deliveredBy)
  const deliveredCounts = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, deliveredBy: { $ne: null } } },
    { $group: { _id: '$deliveredBy', count: { $sum: 1 } } },
  ]);
  const delMap = new Map(deliveredCounts.map((c) => [String(c._id), c.count]));

  const performance = users.map((u) => {
    const uid = String(u._id);
    const taken = createdMap.get(uid)?.count || 0;
    const rev = createdMap.get(uid)?.totalRevenue || 0;
    const cooked = Math.max(prepMap.get(uid) || 0, ticketMap.get(uid) || 0);
    const delivered = delMap.get(uid) || 0;
    const totalTasks = taken + cooked + delivered;

    return {
      userId: uid,
      name: u.name,
      email: u.email,
      role: u.role,
      roles: u.roles || [u.role],
      ordersTaken: taken,
      revenueTaken: Math.round(rev * 100) / 100,
      ordersCooked: cooked,
      ordersDelivered: delivered,
      totalTasksCompleted: totalTasks,
    };
  });

  performance.sort((a, b) => b.totalTasksCompleted - a.totalTasksCompleted);

  return {
    date: label,
    data: performance,
    summary: {
      totalEmployees: users.length,
      totalOrdersTaken: performance.reduce((acc, p) => acc + p.ordersTaken, 0),
      totalOrdersCooked: performance.reduce((acc, p) => acc + p.ordersCooked, 0),
      totalOrdersDelivered: performance.reduce((acc, p) => acc + p.ordersDelivered, 0),
    },
  };
}

async function foodItemsRanking(dateInput = todayStr()) {
  const { start, end, label } = getQueryBounds(dateInput);
  const inRange = { createdAt: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } };

  const itemsAgg = await Order.aggregate([
    { $match: inRange },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        menuItemId: { $first: '$items.menuItem' },
        quantitySold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.lineTotal' },
      },
    },
  ]);

  const items = itemsAgg.map((i) => ({
    name: i._id,
    menuItemId: String(i.menuItemId),
    quantitySold: i.quantitySold,
    totalRevenue: Math.round(i.totalRevenue * 100) / 100,
  }));

  const byQuantity = [...items].sort((a, b) => b.quantitySold - a.quantitySold);
  const byRevenue = [...items].sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    date: label,
    highestByQuantity: byQuantity.slice(0, 10),
    leastByQuantity: [...byQuantity].reverse().slice(0, 10),
    highestByRevenue: byRevenue.slice(0, 10),
    leastByRevenue: [...byRevenue].reverse().slice(0, 10),
    allItems: byQuantity,
  };
}

async function stockWastageReport() {
  const Stock = require('../models/Stock');
  const stocks = await Stock.find({
    $or: [
      { wastedQuantity: { $gt: 0 } },
      { status: { $in: ['wasted', 'expired'] } },
    ],
  }).sort({ updatedAt: -1 }).lean();

  const totalWastedCost = stocks.reduce((sum, s) => {
    const qty = (s.wastedQuantity || 0) + (s.status === 'expired' ? (s.quantity || 0) : 0);
    return sum + (qty * (s.costPrice || 0));
  }, 0);

  return {
    items: stocks.map((s) => ({
      id: String(s._id),
      itemName: s.itemName,
      batchNumber: s.batchNumber,
      unit: s.unit,
      costPrice: s.costPrice,
      wastedQuantity: s.wastedQuantity || 0,
      wasteReason: s.wasteReason || (s.status === 'expired' ? 'Expired Batch' : 'General Spoilage'),
      status: s.status,
      expiryDate: s.expiryDate,
      totalLoss: Math.round(((s.wastedQuantity || 0) + (s.status === 'expired' ? (s.quantity || 0) : 0)) * (s.costPrice || 0) * 100) / 100,
    })),
    totalLoss: Math.round(totalWastedCost * 100) / 100,
  };
}

async function topCustomers(dateInput = null) {
  const match = { customerName: { $exists: true, $ne: '' }, status: { $ne: 'cancelled' } };
  if (dateInput && (dateInput.startDate || dateInput.endDate || dateInput.date)) {
    const { start, end } = getQueryBounds(dateInput);
    match.createdAt = { $gte: start, $lt: end };
  }

  const [orderCounts, customerItemAgg] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customerName',
          visits: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          lastVisit: { $max: '$createdAt' },
        },
      },
      { $sort: { visits: -1, totalSpent: -1 } },
      { $limit: 15 },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { customer: '$customerName', item: '$items.name' },
          qty: { $sum: '$items.quantity' },
        },
      },
      { $sort: { qty: -1 } },
      {
        $group: {
          _id: '$_id.customer',
          favoriteDish: { $first: '$_id.item' },
          favoriteQty: { $first: '$qty' },
        },
      },
    ]),
  ]);

  const favMap = new Map(customerItemAgg.map((f) => [f._id, f]));

  return orderCounts.map((c, idx) => {
    const fav = favMap.get(c._id);
    const total = Math.round(c.totalSpent * 100) / 100;
    const avg = c.visits > 0 ? Math.round((total / c.visits) * 100) / 100 : 0;
    return {
      rank: idx + 1,
      customerName: c._id,
      visits: c.visits,
      totalSpent: total,
      averageOrderValue: avg,
      favoriteDish: fav?.favoriteDish || 'Assorted Items',
      favoriteQty: fav?.favoriteQty || 1,
      lastVisit: c.lastVisit,
    };
  });
}

async function salesGraphsData(dateInput = todayStr()) {
  const Stock = require('../models/Stock');
  const { start, end, label } = getQueryBounds(dateInput);
  const inRange = { createdAt: { $gte: start, $lt: end }, status: { $ne: 'cancelled' } };

  // 1. Daily trend for past 7 days up to end
  const sevenDaysAgo = new Date(end);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const trendMatch = { createdAt: { $gte: sevenDaysAgo, $lt: end }, status: { $ne: 'cancelled' } };

  const [dailyTrendAgg, categoryAgg, paymentAgg, diningAgg, stocks] = await Promise.all([
    Order.aggregate([
      { $match: trendMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: offsetString() } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: inRange },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItem',
          foreignField: '_id',
          as: 'menuItemDoc',
        },
      },
      { $unwind: { path: '$menuItemDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$menuItemDoc.category', 'General'] },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]),
    Order.aggregate([
      { $match: inRange },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          totalAmount: { $sum: '$payments.amount' },
          paymentsCount: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]),
    Order.aggregate([
      { $match: inRange },
      {
        $group: {
          _id: '$type',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]),
    Stock.find({}).lean(),
  ]);

  const totalCatRev = categoryAgg.reduce((sum, c) => sum + c.totalRevenue, 0);
  const categoryBreakdown = categoryAgg.map((c) => ({
    category: c._id,
    quantity: c.totalQuantity,
    revenue: Math.round(c.totalRevenue * 100) / 100,
    percentage: totalCatRev > 0 ? Math.round((c.totalRevenue / totalCatRev) * 1000) / 10 : 0,
  }));

  const totalPayAmt = paymentAgg.reduce((sum, p) => sum + p.totalAmount, 0);
  const paymentMix = paymentAgg.map((p) => ({
    method: p._id,
    amount: Math.round(p.totalAmount * 100) / 100,
    count: p.paymentsCount,
    percentage: totalPayAmt > 0 ? Math.round((p.totalAmount / totalPayAmt) * 1000) / 10 : 0,
  }));

  const totalDiningRev = diningAgg.reduce((sum, d) => sum + d.revenue, 0);
  const diningSplit = diningAgg.map((d) => ({
    type: d._id,
    orders: d.orders,
    revenue: Math.round(d.revenue * 100) / 100,
    percentage: totalDiningRev > 0 ? Math.round((d.revenue / totalDiningRev) * 1000) / 10 : 0,
  }));

  const now = new Date();
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + 7);

  let totalValuation = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  let lowStockCount = 0;
  let healthyCount = 0;
  let totalWastedLoss = 0;

  for (const s of stocks) {
    totalValuation += (s.quantity || 0) * (s.costPrice || 0);
    totalWastedLoss += (s.wastedQuantity || 0) * (s.costPrice || 0);
    if (s.expiryDate < now) {
      expiredCount++;
    } else if (s.expiryDate <= alertDate) {
      expiringSoonCount++;
    } else {
      healthyCount++;
    }
    if (s.status === 'low_stock' || (s.quantity || 0) <= (s.minimumQuantity || 5)) {
      lowStockCount++;
    }
  }

  return {
    date: label,
    dailyTrends: dailyTrendAgg.map((d) => ({
      date: d._id,
      orders: d.orders,
      revenue: Math.round(d.revenue * 100) / 100,
    })),
    categoryBreakdown,
    paymentMix,
    diningSplit,
    orgStockOverview: {
      totalItems: stocks.length,
      totalValuation: Math.round(totalValuation * 100) / 100,
      healthyCount,
      expiringSoonCount,
      expiredCount,
      lowStockCount,
      totalWastedLoss: Math.round(totalWastedLoss * 100) / 100,
    },
  };
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
  employeePerformance,
  foodItemsRanking,
  stockWastageReport,
  topCustomers,
  salesGraphsData,
};

