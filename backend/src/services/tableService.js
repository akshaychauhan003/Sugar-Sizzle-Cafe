const Table = require('../models/Table');
const auditService = require('./auditService');
const { notFound, conflict, badRequest } = require('../lib/errors');

async function list(filter = {}) {
  const q = {};
  if (filter.status) q.status = filter.status;
  if (filter.section) q.section = filter.section;
  return Table.find(q)
    .sort({ section: 1, code: 1 })
    .populate('currentOrder', 'orderNumber status total items customerName createdAt');
}

async function create(input) {
  try {
    return await Table.create(input);
  } catch (e) {
    if (e.code === 11000) throw conflict('Table code already exists', 'DUPLICATE_TABLE');
    throw e;
  }
}

async function update(id, input) {
  const table = await Table.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  if (!table) throw notFound('Table not found');
  return table;
}

async function findByCodeOrId({ tableId, tableNumber }) {
  if (tableId) {
    const t = await Table.findById(tableId);
    if (!t) throw notFound('Table not found');
    return t;
  }
  if (tableNumber) {
    const code = String(tableNumber).trim().toUpperCase();
    const t = await Table.findOne({ code });
    return t; // may be null — tableNumber string is still valid for legacy orders
  }
  return null;
}

async function assignToOrder(table, order) {
  if (!table) return null;
  // Strictly enforce that table must be available (clean & ready) or already assigned to this order
  const updated = await Table.findOneAndUpdate(
    {
      _id: table._id,
      $or: [
        { status: 'available' },
        { currentOrder: order._id },
      ],
    },
    { $set: { status: 'occupied', currentOrder: order._id } },
    { new: true, runValidators: true },
  );
  if (!updated) {
    const current = await Table.findById(table._id);
    if (current?.status === 'occupied') {
      throw conflict(`Table ${table.code} is already booked/occupied by dining guests`, 'TABLE_OCCUPIED');
    }
    if (current?.status === 'cleaning') {
      throw conflict(`Table ${table.code} has not been cleaned yet. Waitstaff must clean it first.`, 'TABLE_NOT_CLEAN');
    }
    throw conflict(`Table ${table.code} is currently ${current?.status || 'unavailable'} and cannot be booked`, 'TABLE_UNAVAILABLE');
  }
  return updated;
}

async function releaseFromOrder(order) {
  const filter = order.tableId
    ? { _id: order.tableId }
    : order.tableNumber
      ? { code: String(order.tableNumber).trim().toUpperCase() }
      : null;
  if (!filter) return null;
  return Table.findOneAndUpdate(
    { ...filter, currentOrder: order._id },
    { $set: { status: 'available', currentOrder: null } },
    { new: true },
  );
}

async function markCustomerLeft(id, user) {
  const table = await Table.findById(id).populate('currentOrder', 'orderNumber status');
  if (!table) throw notFound('Table not found');
  table.status = 'cleaning';
  await table.save();

  if (user) {
    await auditService.log(
      user,
      'table.customer_left',
      'Table',
      table._id,
      `Table ${table.code}: Customer has eaten and left restaurant. Waitstaff marked table for cleaning.`,
      { tableCode: table.code, status: 'cleaning', previousOrder: table.currentOrder?.orderNumber },
    );
  }
  return table;
}

async function markCleaned(id, user) {
  const table = await Table.findById(id);
  if (!table) throw notFound('Table not found');
  table.status = 'available';
  table.currentOrder = null;
  await table.save();

  if (user) {
    await auditService.log(
      user,
      'table.cleaned',
      'Table',
      table._id,
      `Table ${table.code}: Cleaned and sanitized by waitstaff. Now ready & available for next customer.`,
      { tableCode: table.code, status: 'available' },
    );
  }
  return table;
}

async function setStatus(id, status, user) {
  if (!Table.STATUSES.includes(status)) throw badRequest('Invalid table status');
  const table = await Table.findById(id);
  if (!table) throw notFound('Table not found');
  if (status === 'available') {
    table.currentOrder = null;
  }
  table.status = status;
  await table.save();

  if (user) {
    await auditService.log(
      user,
      'table.status',
      'Table',
      table._id,
      `Table ${table.code} status changed to ${status}`,
      { tableCode: table.code, status },
    );
  }
  return table;
}

module.exports = {
  list,
  create,
  update,
  findByCodeOrId,
  assignToOrder,
  releaseFromOrder,
  markCustomerLeft,
  markCleaned,
  setStatus,
};
