const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const { todayStr } = require('../lib/dates');
const { notFound, conflict } = require('../lib/errors');

async function nextInvoiceNumber() {
  const day = todayStr();
  const c = await Counter.findOneAndUpdate(
    { _id: `invoice-${day}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `INV-${day.replace(/-/g, '')}-${String(c.seq).padStart(4, '0')}`;
}

function buildSnapshot(order) {
  return {
    orderNumber: order.orderNumber,
    type: order.type,
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      notes: i.notes,
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    couponCode: order.couponCode,
    couponDiscountAmount: order.couponDiscountAmount,
    taxRate: order.taxRate,
    taxAmount: order.taxAmount,
    total: order.total,
    payments: (order.payments || []).map((p) => ({
      method: p.method,
      amount: p.amount,
      at: p.at,
      reference: p.reference,
    })),
  };
}

async function createForOrder(order) {
  const existing = await Invoice.findOne({ order: order._id });
  if (existing) return existing;
  return Invoice.create({
    invoiceNumber: await nextInvoiceNumber(),
    order: order._id,
    snapshot: buildSnapshot(order),
    issuedAt: new Date(),
  });
}

async function getByOrder(orderId) {
  const invoice = await Invoice.findOne({ order: orderId }).populate('reprints.by', 'name role');
  if (!invoice) throw notFound('Invoice not found for this order');
  return invoice;
}

async function reprint(invoiceId, user) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw notFound('Invoice not found');
  invoice.reprints.push({ at: new Date(), by: user?._id });
  await invoice.save();
  return invoice;
}

async function ensureForCompletedOrder(orderId) {
  const order = typeof orderId === 'object' ? orderId : await Order.findById(orderId);
  if (!order) throw notFound('Order not found');
  if (order.status !== 'completed') throw conflict('Invoice is only issued for completed orders');
  return createForOrder(order);
}

module.exports = { createForOrder, getByOrder, reprint, ensureForCompletedOrder, nextInvoiceNumber };
