const KitchenTicket = require('../models/KitchenTicket');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const { todayStr } = require('../lib/dates');
const { notFound, conflict, badRequest } = require('../lib/errors');

async function nextTicketNumber() {
  const day = todayStr();
  const c = await Counter.findOneAndUpdate(
    { _id: `ticket-${day}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `KT-${day.replace(/-/g, '')}-${String(c.seq).padStart(4, '0')}`;
}

async function createTicketForOrder(order, { kitchenNotes } = {}) {
  const existing = await KitchenTicket.findOne({ order: order._id, status: { $ne: 'ready' } });
  if (existing) return existing;

  const items = (order.items || []).map((i) => ({
    orderItemId: i._id,
    name: i.name,
    quantity: i.quantity,
    notes: i.notes || '',
    prepStatus: 'pending',
  }));
  if (!items.length) throw badRequest('Order has no items for kitchen ticket');

  return KitchenTicket.create({
    ticketNumber: await nextTicketNumber(),
    order: order._id,
    items,
    kitchenNotes: kitchenNotes || order.notes || '',
    status: 'pending',
  });
}

async function listActive(includeReady = false) {
  const query = includeReady
    ? {
        $or: [
          { status: { $in: ['pending', 'in_progress'] } },
          { status: 'ready', readyAt: { $gte: new Date(Date.now() - 12 * 3600000) } },
        ],
      }
    : { status: { $in: ['pending', 'in_progress'] } };

  return KitchenTicket.find(query)
    .sort({ createdAt: 1 })
    .populate('order', 'orderNumber type tableNumber status customerName')
    .populate('assignedTo', 'name role');
}

async function startCooking(ticketId, user) {
  const ticket = await KitchenTicket.findById(ticketId);
  if (!ticket) throw notFound('Kitchen ticket not found');
  ticket.items.forEach((i) => {
    if (i.prepStatus === 'pending') i.prepStatus = 'preparing';
  });
  ticket.status = 'in_progress';
  if (user && !ticket.assignedTo) ticket.assignedTo = user._id;
  await ticket.save();

  const order = await Order.findById(ticket.order);
  if (order && order.status === 'pending') {
    const orderService = require('./orderService');
    await orderService.updateStatus(order._id, 'preparing', user, 'Chef started cooking');
  }
  return ticket;
}

async function addNotes(ticketId, kitchenNotes, user) {
  const ticket = await KitchenTicket.findById(ticketId);
  if (!ticket) throw notFound('Kitchen ticket not found');
  ticket.kitchenNotes = kitchenNotes || '';
  if (user && !ticket.assignedTo) ticket.assignedTo = user._id;
  await ticket.save();
  return ticket;
}

async function updateItemStatus(ticketId, itemId, prepStatus, user) {
  if (!['pending', 'preparing', 'ready'].includes(prepStatus)) {
    throw badRequest('Invalid prep status');
  }
  const ticket = await KitchenTicket.findById(ticketId);
  if (!ticket) throw notFound('Kitchen ticket not found');
  if (ticket.status === 'ready') throw conflict('Ticket is already ready', 'TICKET_READY');

  const item = ticket.items.id(itemId);
  if (!item) throw notFound('Ticket item not found');
  item.prepStatus = prepStatus;

  const allReady = ticket.items.every((i) => i.prepStatus === 'ready');
  const anyStarted = ticket.items.some((i) => i.prepStatus !== 'pending');
  if (allReady) {
    ticket.status = 'ready';
    ticket.readyAt = new Date();
  } else if (anyStarted) {
    ticket.status = 'in_progress';
  }
  if (user && !ticket.assignedTo) ticket.assignedTo = user._id;
  await ticket.save();

  if (allReady) {
    const order = await Order.findById(ticket.order);
    if (order && order.status === 'preparing') {
      order.status = 'ready';
      order.preparedAt = ticket.readyAt;
      order.statusHistory.push({ status: 'ready', by: user?._id, note: 'All items ready' });
      await order.save();
    }
  }
  return ticket;
}

async function markReady(ticketId, user) {
  const ticket = await KitchenTicket.findById(ticketId);
  if (!ticket) throw notFound('Kitchen ticket not found');
  ticket.items.forEach((i) => { i.prepStatus = 'ready'; });
  ticket.status = 'ready';
  ticket.readyAt = new Date();
  if (user) ticket.assignedTo = ticket.assignedTo || user._id;
  await ticket.save();

  // Align order preparedAt / status if still preparing
  const order = await Order.findById(ticket.order);
  if (order && order.status === 'preparing') {
    order.status = 'ready';
    order.preparedAt = ticket.readyAt;
    order.statusHistory.push({ status: 'ready', by: user?._id, note: 'Kitchen ticket ready' });
    await order.save();
  } else if (order && !order.preparedAt) {
    order.preparedAt = ticket.readyAt;
    await order.save();
  }
  return ticket;
}

async function markTicketReadyForOrder(orderId) {
  const ticket = await KitchenTicket.findOne({ order: orderId, status: { $ne: 'ready' } });
  if (!ticket) return null;
  ticket.items.forEach((i) => { i.prepStatus = 'ready'; });
  ticket.status = 'ready';
  ticket.readyAt = new Date();
  await ticket.save();
  return ticket;
}

module.exports = {
  createTicketForOrder, listActive, updateItemStatus, markReady, markTicketReadyForOrder, addNotes, nextTicketNumber, startCooking,
};
