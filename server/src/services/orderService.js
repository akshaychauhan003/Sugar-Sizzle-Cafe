const mongoose = require('mongoose');
const env = require('../config/env');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Counter = require('../models/Counter');
const Setting = require('../models/Setting');
const Payment = require('../models/Payment');
const { computeBill } = require('./billing');
const { assertTransition } = require('./orderStatus');
const { toMinor, fromMinor, roundPct } = require('../lib/money');
const { dayBounds, todayStr } = require('../lib/dates');
const { badRequest, notFound, conflict, forbidden } = require('../lib/errors');
const { isManager, isCashierLike } = require('../lib/roles');
const couponService = require('./couponService');
const kitchenService = require('./kitchenService');
const invoiceService = require('./invoiceService');
const tableService = require('./tableService');
const auditService = require('./auditService');

async function getTaxRate() {
  const s = await Setting.findOne({ key: 'taxRate' }).lean();
  return typeof s?.value === 'number' ? s.value : env.defaultTaxRate;
}

/** Load menu items from DB (authoritative prices) and reject unavailable or out-of-stock ones. */
async function resolveLines(items) {
  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const docs = await MenuItem.find({ _id: { $in: ids } }).lean();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const problems = [];
  const lines = items.map((i) => {
    const m = byId.get(i.menuItemId);
    if (!m) { problems.push({ menuItemId: i.menuItemId, reason: 'not_found' }); return null; }
    if (!m.isActive || !m.isAvailable || m.stockStatus === 'out_of_stock') {
      problems.push({ menuItemId: i.menuItemId, name: m.name, reason: 'unavailable' });
      return null;
    }
    // Stock validation against inventory quantity (if tracked)
    if (m.inventoryQuantity !== null && m.inventoryQuantity !== undefined) {
      if (m.inventoryQuantity < i.quantity) {
        problems.push({
          menuItemId: i.menuItemId,
          name: m.name,
          reason: 'insufficient_stock',
          available: m.inventoryQuantity,
          requested: i.quantity,
        });
        return null;
      }
    }
    return { menuItem: m._id, name: m.name, sku: m.sku, unitPrice: m.price, quantity: i.quantity, notes: i.notes || '' };
  });
  if (problems.length) {
    const insufficient = problems.find((p) => p.reason === 'insufficient_stock');
    if (insufficient) {
      throw badRequest(
        `Insufficient stock for ${insufficient.name}: only ${insufficient.available} available (requested: ${insufficient.requested})`,
        problems,
        'INSUFFICIENT_STOCK'
      );
    }
    const unavailable = problems.some((p) => p.reason === 'unavailable');
    throw badRequest(
      unavailable ? 'One or more items are unavailable' : 'One or more items do not exist',
      problems,
      unavailable ? 'ITEM_UNAVAILABLE' : 'ITEM_NOT_FOUND'
    );
  }
  return lines;
}


function enforceDiscountPolicy(user, bill) {
  if (isManager(user) || bill.discountMinor === 0) return;
  const cap = roundPct(bill.subtotalMinor, env.staffMaxDiscountPercent);
  if (bill.discountMinor > cap) {
    throw forbidden(`Staff may apply at most ${env.staffMaxDiscountPercent}% discount; ask an admin to approve more`, 'DISCOUNT_LIMIT_EXCEEDED');
  }
}

async function priceOrder(user, input) {
  const [lines, taxRate] = await Promise.all([resolveLines(input.items), getTaxRate()]);

  let discount = input.discount;
  let couponCode = null;
  let couponDiscountAmount = 0;
  let extraDiscountMinor = 0;

  if (input.couponCode) {
    // Provisional subtotal for coupon min-order checks
    const provisional = computeBill({ lines, taxRate, discount: undefined });
    const validated = await couponService.validateCoupon(input.couponCode, provisional.subtotal);
    couponCode = validated.code;
    couponDiscountAmount = validated.discountAmount;
    if (discount) {
      // Stack coupon as extra flat after manual discount
      extraDiscountMinor = toMinor(validated.discountAmount);
    } else {
      discount = couponService.toDiscountInput(validated);
    }
  }

  const bill = computeBill({ lines, taxRate, discount, extraDiscountMinor });
  enforceDiscountPolicy(user, bill);
  bill.couponCode = couponCode;
  bill.couponDiscountAmount = couponDiscountAmount;
  return bill;
}

const billFields = (bill, discount) => ({
  items: bill.lines,
  discount: discount && bill.discountMinor > 0 ? discount : undefined,
  couponCode: bill.couponCode || undefined,
  couponDiscountAmount: bill.couponDiscountAmount || 0,
  taxRate: bill.taxRate,
  subtotal: bill.subtotal,
  discountAmount: bill.discountAmount,
  taxAmount: bill.taxAmount,
  total: bill.total,
  totalMinor: bill.totalMinor,
});

async function quote(user, input) {
  const bill = await priceOrder(user, input);
  return {
    lines: bill.lines.map((l) => ({
      menuItemId: String(l.menuItem), name: l.name, unitPrice: l.unitPrice, quantity: l.quantity, lineTotal: l.lineTotal,
    })),
    subtotal: bill.subtotal,
    discountAmount: bill.discountAmount,
    couponCode: bill.couponCode || null,
    couponDiscountAmount: bill.couponDiscountAmount || 0,
    taxRate: bill.taxRate,
    taxAmount: bill.taxAmount,
    total: bill.total,
    taxNote: `Tax of ${bill.taxRate}% is added after discount`,
  };
}

async function nextOrderNumber() {
  const day = todayStr();
  const c = await Counter.findOneAndUpdate({ _id: `order-${day}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `ORD-${day.replace(/-/g, '')}-${String(c.seq).padStart(4, '0')}`;
}

async function nextPaymentRef() {
  const day = todayStr();
  const c = await Counter.findOneAndUpdate({ _id: `pay-${day}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `PAY-${day.replace(/-/g, '')}-${String(c.seq).padStart(4, '0')}`;
}

async function resolveTableForOrder(input) {
  if (input.type !== 'dine-in') return { tableId: null, tableNumber: null, table: null };
  const table = await tableService.findByCodeOrId({
    tableId: input.tableId,
    tableNumber: input.tableNumber,
  });
  const tableNumber = table?.code || input.tableNumber || null;
  if (!tableNumber) throw badRequest('tableNumber is required for dine-in orders');
  return { tableId: table?._id || input.tableId || null, tableNumber, table };
}

async function createOrder(user, input, idempotencyKey) {
  if (idempotencyKey) {
    const existing = await Order.findOne({ createdBy: user._id, idempotencyKey });
    if (existing) return { order: existing, replay: true };
  }
  const bill = await priceOrder(user, input);
  const { tableId, tableNumber, table } = await resolveTableForOrder(input);
  // Manual discount stored on order; coupon tracked via couponCode / couponDiscountAmount
  const storedDiscount = input.discount;

  const doc = {
    orderNumber: await nextOrderNumber(),
    type: input.type,
    tableNumber: input.type === 'dine-in' ? tableNumber : null,
    tableId: input.type === 'dine-in' ? tableId : null,
    customerName: input.customerName,
    notes: input.notes,
    ...billFields(bill, storedDiscount),
    status: 'pending',
    statusHistory: [{ status: 'pending', by: user._id }],
    createdBy: user._id,
    idempotencyKey,
  };

  if (table) {
    if (table.status === 'occupied' && table.currentOrder) {
      throw conflict(`Table ${table.code} is already occupied`, 'TABLE_OCCUPIED');
    }
  }

  // Atomically deduct inventory for tracked items
  const deductedItems = [];
  try {
    for (const line of bill.lines) {
      const menuItemId = line.menuItem;
      const qty = line.quantity;
      const updatedItem = await MenuItem.findOneAndUpdate(
        { _id: menuItemId, inventoryQuantity: { $ne: null, $gte: qty } },
        { $inc: { inventoryQuantity: -qty } },
        { new: true }
      );
      if (updatedItem) {
        deductedItems.push({ menuItemId, quantity: qty });
        if (updatedItem.inventoryQuantity === 0) {
          await MenuItem.findByIdAndUpdate(menuItemId, { stockStatus: 'out_of_stock', isAvailable: false });
        } else if (updatedItem.inventoryQuantity <= 5 && updatedItem.stockStatus !== 'low_stock') {
          await MenuItem.findByIdAndUpdate(menuItemId, { stockStatus: 'low_stock' });
        }
      } else {
        const check = await MenuItem.findById(menuItemId);
        if (check && check.inventoryQuantity !== null && check.inventoryQuantity < qty) {
          throw conflict(`Insufficient stock for ${check.name}: only ${check.inventoryQuantity} available (requested: ${qty})`, 'INSUFFICIENT_STOCK');
        }
      }
    }
  } catch (err) {
    for (const d of deductedItems) {
      await MenuItem.findByIdAndUpdate(d.menuItemId, { $inc: { inventoryQuantity: d.quantity } });
    }
    throw err;
  }

  let order;
  try {
    order = await Order.create(doc);
    if (table) await tableService.assignToOrder(table, order);
  } catch (e) {
    for (const d of deductedItems) {
      await MenuItem.findByIdAndUpdate(d.menuItemId, { $inc: { inventoryQuantity: d.quantity } }).catch(() => {});
    }
    if (order?._id) {
      await Order.findByIdAndDelete(order._id).catch(() => {});
    }
    if (e.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ createdBy: user._id, idempotencyKey });
      if (existing) return { order: existing, replay: true };
    }
    throw e;
  }


  if (bill.couponCode) await couponService.incrementUse(bill.couponCode);
  await auditService.log(user, 'order.create', 'Order', order._id, `Created ${order.orderNumber}`, {
    total: order.total, type: order.type,
  });
  return { order, replay: false };
}

async function updateOrder(user, id, input) {
  const order = await Order.findById(id);
  if (!order) throw notFound('Order not found');
  if (order.status !== 'pending') throw conflict('Only pending orders can be edited', 'ORDER_NOT_EDITABLE');
  if (order.amountPaidMinor > 0) throw conflict('Order has payments and cannot be edited', 'ORDER_NOT_EDITABLE');

  const merged = {
    type: input.type ?? order.type,
    tableNumber: input.tableNumber ?? order.tableNumber,
    tableId: input.tableId !== undefined ? input.tableId : (order.tableId ? String(order.tableId) : undefined),
    customerName: input.customerName ?? order.customerName,
    notes: input.notes ?? order.notes,
    items: input.items ?? order.items.map((i) => ({ menuItemId: String(i.menuItem), quantity: i.quantity, notes: i.notes })),
    discount: input.discount ?? (order.discount?.type ? { type: order.discount.type, value: order.discount.value } : undefined),
    couponCode: input.couponCode !== undefined ? input.couponCode : order.couponCode,
  };
  if (merged.type === 'dine-in' && !merged.tableNumber && !merged.tableId) {
    throw badRequest('tableNumber is required for dine-in orders');
  }

  const bill = await priceOrder(user, merged);
  const { tableId, tableNumber, table } = await resolveTableForOrder(merged);

  // Release previous table if changed
  if (order.tableId || order.tableNumber) {
    const prevSame = (tableId && order.tableId && String(tableId) === String(order.tableId))
      || (tableNumber && order.tableNumber && String(tableNumber).toUpperCase() === String(order.tableNumber).toUpperCase());
    if (!prevSame) await tableService.releaseFromOrder(order);
  }

  const storedDiscount = merged.discount;
  const $set = {
    type: merged.type,
    tableNumber: merged.type === 'dine-in' ? tableNumber : null,
    tableId: merged.type === 'dine-in' ? tableId : null,
    customerName: merged.customerName,
    notes: merged.notes,
    ...billFields(bill, storedDiscount),
  };
  const updated = await Order.findOneAndUpdate(
    { _id: id, status: 'pending', amountPaidMinor: 0 },
    { $set, ...(storedDiscount && bill.discountMinor > 0 ? {} : { $unset: { discount: 1 } }) },
    { new: true },
  );
  if (!updated) throw conflict('Order changed while editing; reload and try again', 'CONCURRENT_MODIFICATION');
  if (table) await tableService.assignToOrder(table, updated);
  return updated;
}

async function changeStatus(user, id, to, note) {
  const order = await Order.findById(id);
  if (!order) throw notFound('Order not found');

  if (to === 'preparing' && (order.isConfirmed || order.status !== 'pending')) {
    throw conflict(`Cannot move order from '${order.status}' to 'preparing': Order has already been confirmed`, 'ORDER_ALREADY_CONFIRMED');
  }

  assertTransition({
    from: order.status, to, role: user.role,
    amountPaidMinor: order.amountPaidMinor, totalMinor: order.totalMinor,
  });

  const now = new Date();
  const stamps = {};
  if (to === 'preparing') {
    stamps.acceptedAt = now;
    stamps.isConfirmed = true;
    stamps.confirmedAt = now;
    stamps.confirmedBy = user._id;
  }
  if (to === 'ready') stamps.preparedAt = now;
  if (to === 'completed') {
    stamps.completedAt = now;
    stamps.servedAt = now;
  }

  const filter = { _id: id, status: order.status, amountPaidMinor: order.amountPaidMinor };
  if (to === 'preparing') {
    filter.$or = [{ isConfirmed: false }, { isConfirmed: { $exists: false } }];
  }

  const updated = await Order.findOneAndUpdate(
    filter,
    { $set: { status: to, ...stamps }, $push: { statusHistory: { status: to, by: user._id, note } } },
    { new: true },
  );
  if (!updated) {
    const fresh = await Order.findById(id);
    if (to === 'preparing' && fresh && (fresh.isConfirmed || fresh.status !== 'pending')) {
      throw conflict(`Cannot move order: Order ${fresh.orderNumber} has already been confirmed`, 'ORDER_ALREADY_CONFIRMED');
    }
    throw conflict('Order was modified by someone else; reload and try again', 'CONCURRENT_MODIFICATION');
  }

  if (to === 'preparing') {
    await kitchenService.createTicketForOrder(updated, { kitchenNotes: note });
  }
  if (to === 'ready') {
    await kitchenService.markTicketReadyForOrder(updated._id);
  }
  if (to === 'completed') {
    await tableService.releaseFromOrder(updated);
    await invoiceService.createForOrder(updated);
  }
  if (to === 'cancelled') {
    await tableService.releaseFromOrder(updated);
    for (const line of updated.items) {
      const restored = await MenuItem.findOneAndUpdate(
        { _id: line.menuItem, inventoryQuantity: { $ne: null } },
        { $inc: { inventoryQuantity: line.quantity } },
        { new: true }
      );
      if (restored && restored.inventoryQuantity > 0 && (restored.stockStatus === 'out_of_stock' || !restored.isAvailable)) {
        await MenuItem.findByIdAndUpdate(line.menuItem, {
          isAvailable: true,
          stockStatus: restored.inventoryQuantity <= 5 ? 'low_stock' : 'in_stock',
        });
      }
    }
  }

  await auditService.log(user, 'order.status', 'Order', updated._id, `${updated.orderNumber} → ${to}`, { from: order.status, to });
  return updated;

}

async function confirmOrder(user, id, note) {
  const order = await Order.findById(id);
  if (!order) throw notFound('Order not found');
  if (order.status === 'cancelled') {
    throw conflict('Cannot confirm a cancelled order', 'ORDER_CANCELLED');
  }
  if (order.isConfirmed || order.status !== 'pending') {
    throw conflict(`Cannot move order: Order ${order.orderNumber} has already been confirmed`, 'ORDER_ALREADY_CONFIRMED');
  }
  if (!isCashierLike(user.role) && !isManager(user.role)) {
    throw forbidden('You do not have permission to confirm this order');
  }

  const now = new Date();
  const updated = await Order.findOneAndUpdate(
    {
      _id: id,
      status: 'pending',
      $or: [{ isConfirmed: false }, { isConfirmed: { $exists: false } }],
    },
    {
      $set: {
        status: 'preparing',
        isConfirmed: true,
        confirmedAt: now,
        confirmedBy: user._id,
        acceptedAt: now,
      },
      $push: {
        statusHistory: { status: 'preparing', by: user._id, note: note || 'Order confirmed and sent to kitchen' },
      },
    },
    { new: true },
  );

  if (!updated) {
    const fresh = await Order.findById(id);
    if (fresh && (fresh.isConfirmed || fresh.status !== 'pending')) {
      throw conflict(`Cannot move order: Order ${fresh.orderNumber} has already been confirmed`, 'ORDER_ALREADY_CONFIRMED');
    }
    throw conflict('Order was modified by someone else; reload and try again', 'CONCURRENT_MODIFICATION');
  }

  await kitchenService.createTicketForOrder(updated, { kitchenNotes: note });
  await auditService.log(user, 'order.confirm', 'Order', updated._id, `Confirmed ${updated.orderNumber}`, { from: 'pending', to: 'preparing' });
  return updated;
}

async function recordPayment(user, id, input) {
  const order = await Order.findById(id);
  if (!order) throw notFound('Order not found');
  const key = input.idempotencyKey;
  if (key && order.payments.some((p) => p.idempotencyKey === key)) return { order, replay: true };
  if (order.status === 'cancelled') throw conflict('Cannot record a payment on a cancelled order', 'ORDER_CANCELLED');
  const balanceM = order.totalMinor - order.amountPaidMinor;
  if (balanceM <= 0) throw conflict('Order is already fully paid', 'ALREADY_PAID');
  const amountM = input.amount !== undefined ? toMinor(input.amount) : balanceM;
  if (amountM > balanceM) throw conflict(`Payment exceeds balance due (${fromMinor(balanceM).toFixed(2)})`, 'OVERPAYMENT');

  const filter = { _id: id, status: { $ne: 'cancelled' }, amountPaidMinor: { $lte: order.totalMinor - amountM } };
  if (key) filter['payments.idempotencyKey'] = { $ne: key };
  const updated = await Order.findOneAndUpdate(filter, {
    $inc: { amountPaidMinor: amountM },
    $push: {
      payments: {
        method: input.method,
        amount: fromMinor(amountM),
        amountMinor: amountM,
        reference: input.reference,
        idempotencyKey: key,
        recordedBy: user._id,
      },
    },
  }, { new: true });
  if (!updated) {
    const fresh = await Order.findById(id);
    if (key && fresh?.payments.some((p) => p.idempotencyKey === key)) return { order: fresh, replay: true };
    throw conflict('Payment conflicted with another update; reload and try again', 'CONCURRENT_MODIFICATION');
  }

  // Standalone Payment history (sync with embedded)
  try {
    if (key) {
      const existingPay = await Payment.findOne({ recordedBy: user._id, idempotencyKey: key });
      if (!existingPay) {
        await Payment.create({
          paymentRef: await nextPaymentRef(),
          order: updated._id,
          amount: fromMinor(amountM),
          amountMinor: amountM,
          method: input.method,
          status: 'recorded',
          recordedBy: user._id,
          transactionRef: input.reference || '',
          idempotencyKey: key,
        });
      }
    } else {
      await Payment.create({
        paymentRef: await nextPaymentRef(),
        order: updated._id,
        amount: fromMinor(amountM),
        amountMinor: amountM,
        method: input.method,
        status: 'recorded',
        recordedBy: user._id,
        transactionRef: input.reference || '',
      });
    }
  } catch (e) {
    if (e.code !== 11000) console.warn('Payment doc sync failed:', e.message);
  }

  await auditService.log(user, 'order.payment', 'Order', updated._id,
    `Payment ${fromMinor(amountM)} via ${input.method} on ${updated.orderNumber}`,
    { method: input.method, amount: fromMinor(amountM) });

  return { order: updated, replay: false };
}

function buildListFilter(q) {
  const f = {};
  if (q.status) f.status = q.status;
  if (q.type) f.type = q.type;
  if (q.q) {
    const rx = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = [{ orderNumber: rx }, { customerName: rx }];
  }
  if (q.date) { const { start, end } = dayBounds(q.date); f.createdAt = { $gte: start, $lt: end }; }
  if (q.paymentStatus === 'unpaid') f.amountPaidMinor = 0;
  if (q.paymentStatus === 'paid') f.$expr = { $gte: ['$amountPaidMinor', '$totalMinor'] };
  if (q.paymentStatus === 'partial') { f.amountPaidMinor = { $gt: 0 }; f.$expr = { $lt: ['$amountPaidMinor', '$totalMinor'] }; }
  return f;
}

async function getOrderPayments(orderId) {
  return Payment.find({ order: orderId }).sort({ createdAt: -1 }).populate('recordedBy', 'name role');
}

async function nextReturnNumber() {
  const day = todayStr();
  const c = await Counter.findOneAndUpdate({ _id: `return-${day}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `RET-${day.replace(/-/g, '')}-${String(c.seq).padStart(4, '0')}`;
}

async function processSalesReturn(user, id, {
  items = null,
  reason = 'Customer Sales Return',
  restock = true,
  refundAmount = undefined,
  paymentMethod = 'cash',
  password = undefined,
} = {}) {
  const order = await Order.findById(id);
  if (!order) throw notFound('Order not found');

  if (password) {
    const bcrypt = require('bcryptjs');
    const User = require('../models/User');
    const u = await User.findById(user._id);
    const ok = u && await bcrypt.compare(password, u.passwordHash);
    if (!ok) throw unauthorized('Invalid password verification for sales return', 'INVALID_PASSWORD');
  }

  if (order.status === 'cancelled') {
    throw conflict('Cancelled orders cannot be returned', 'ORDER_CANCELLED');
  }

  let returnItems = [];
  if (items && items.length > 0) {
    for (const ret of items) {
      const orderItem = order.items.find((i) => String(i.menuItem) === String(ret.menuItemId));
      if (!orderItem) {
        throw badRequest(`Item ${ret.menuItemId} is not in this order`, null, 'ITEM_NOT_IN_ORDER');
      }
      const previouslyReturned = (order.returns || []).reduce((sum, r) => {
        const match = (r.items || []).find((ri) => String(ri.menuItem) === String(ret.menuItemId));
        return sum + (match ? match.quantity : 0);
      }, 0);
      const remainingPurchased = orderItem.quantity - previouslyReturned;
      if (ret.quantity > remainingPurchased) {
        throw conflict(
          `Cannot return ${ret.quantity}× ${orderItem.name}; only ${remainingPurchased} remaining unreturned`,
          'EXCEEDS_PURCHASED_QUANTITY'
        );
      }
      returnItems.push({
        menuItem: orderItem.menuItem,
        name: orderItem.name,
        unitPrice: orderItem.unitPrice,
        quantity: ret.quantity,
        lineTotal: Math.round(orderItem.unitPrice * ret.quantity * 100) / 100,
        restocked: ret.restock !== false && restock !== false,
      });
    }
  } else {
    for (const orderItem of order.items) {
      const previouslyReturned = (order.returns || []).reduce((sum, r) => {
        const match = (r.items || []).find((ri) => String(ri.menuItem) === String(orderItem.menuItem));
        return sum + (match ? match.quantity : 0);
      }, 0);
      const remaining = orderItem.quantity - previouslyReturned;
      if (remaining > 0) {
        returnItems.push({
          menuItem: orderItem.menuItem,
          name: orderItem.name,
          unitPrice: orderItem.unitPrice,
          quantity: remaining,
          lineTotal: Math.round(orderItem.unitPrice * remaining * 100) / 100,
          restocked: restock !== false,
        });
      }
    }
  }

  if (returnItems.length === 0) {
    throw conflict('All items in this order have already been returned', 'ALREADY_RETURNED');
  }

  const calculatedItemsTotal = returnItems.reduce((acc, i) => acc + i.lineTotal, 0);
  const currentPaidMinor = order.amountPaidMinor || 0;
  let refundAmtMinor;
  if (refundAmount !== undefined) {
    refundAmtMinor = toMinor(refundAmount);
  } else {
    refundAmtMinor = Math.min(toMinor(calculatedItemsTotal), currentPaidMinor);
  }

  if (refundAmtMinor > currentPaidMinor) {
    throw conflict(
      `Refund amount (${fromMinor(refundAmtMinor).toFixed(2)}) exceeds paid amount (${fromMinor(currentPaidMinor).toFixed(2)})`,
      'INVALID_REFUND_AMOUNT'
    );
  }

  // Stock restoration for returned items
  const restoredStock = [];
  for (const retItem of returnItems) {
    if (retItem.restocked) {
      const updated = await MenuItem.findOneAndUpdate(
        { _id: retItem.menuItem, inventoryQuantity: { $ne: null } },
        { $inc: { inventoryQuantity: retItem.quantity } },
        { new: true }
      );
      if (updated) {
        restoredStock.push({
          menuItemId: retItem.menuItem,
          name: retItem.name,
          quantityRestored: retItem.quantity,
          newStock: updated.inventoryQuantity,
        });
        if (updated.inventoryQuantity > 0 && (updated.stockStatus === 'out_of_stock' || !updated.isAvailable)) {
          await MenuItem.findByIdAndUpdate(retItem.menuItem, {
            isAvailable: true,
            stockStatus: updated.inventoryQuantity <= 5 ? 'low_stock' : 'in_stock',
          });
        }
      }
    }
  }

  const returnNumber = await nextReturnNumber();
  const returnDoc = {
    returnNumber,
    items: returnItems,
    refundAmount: fromMinor(refundAmtMinor),
    refundAmountMinor: refundAmtMinor,
    reason: reason || 'Customer Sales Return',
    restocked: restock !== false,
    returnedBy: user._id,
    returnedAt: new Date(),
  };

  const updateQuery = {
    $push: { returns: returnDoc },
    $inc: { totalRefundedMinor: refundAmtMinor, amountPaidMinor: -refundAmtMinor },
    $set: { isReturned: true },
  };

  if (refundAmtMinor > 0) {
    updateQuery.$push.payments = {
      method: paymentMethod,
      amount: -fromMinor(refundAmtMinor),
      amountMinor: -refundAmtMinor,
      reference: `Sales Return ${returnNumber}: ${reason || 'Customer Return'}`,
      recordedBy: user._id,
      at: new Date(),
    };
  }

  const updatedOrder = await Order.findByIdAndUpdate(id, updateQuery, { new: true });

  if (refundAmtMinor > 0) {
    await Payment.create({
      paymentRef: await nextPaymentRef(),
      order: updatedOrder._id,
      amount: fromMinor(refundAmtMinor),
      amountMinor: refundAmtMinor,
      method: paymentMethod,
      status: 'refunded',
      recordedBy: user._id,
      transactionRef: `${returnNumber}: ${reason || 'Sales Return'}`,
    });
  }

  await auditService.log(
    user,
    'order.sales_return',
    'Order',
    updatedOrder._id,
    `Sales Return ${returnNumber} on ${updatedOrder.orderNumber}: Refunded ${fromMinor(refundAmtMinor)}, restored ${restoredStock.length} items to stock`,
    { returnNumber, refundAmount: fromMinor(refundAmtMinor), items: returnItems, restoredStock }
  );

  return {
    order: updatedOrder,
    salesReturn: returnDoc,
    restoredStock,
  };
}

async function refundOrder(user, id, { amount, reason = '', restock = true } = {}) {
  const res = await processSalesReturn(user, id, {
    reason: reason || 'Authorized Refund',
    restock,
    refundAmount: amount,
  });
  return res.order;
}

module.exports = {
  getTaxRate, quote, createOrder, updateOrder, changeStatus, confirmOrder, recordPayment,
  getOrderPayments, refundOrder, processSalesReturn, buildListFilter, mongoose,
};

