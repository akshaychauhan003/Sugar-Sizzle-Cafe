const Table = require('../models/Table');
const { notFound, conflict, badRequest } = require('../lib/errors');

async function list(filter = {}) {
  const q = {};
  if (filter.status) q.status = filter.status;
  if (filter.section) q.section = filter.section;
  return Table.find(q).sort({ section: 1, code: 1 }).populate('currentOrder', 'orderNumber status total');
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
  const updated = await Table.findOneAndUpdate(
    {
      _id: table._id,
      $or: [
        { status: { $ne: 'occupied' } },
        { currentOrder: order._id },
        { currentOrder: null },
      ],
    },
    { $set: { status: 'occupied', currentOrder: order._id } },
    { new: true, runValidators: true },
  );
  if (!updated) {
    throw conflict(`Table ${table.code} is already occupied`, 'TABLE_OCCUPIED');
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

async function setStatus(id, status) {
  if (!Table.STATUSES.includes(status)) throw badRequest('Invalid table status');
  const table = await Table.findById(id);
  if (!table) throw notFound('Table not found');
  if (status === 'available') {
    table.currentOrder = null;
  }
  table.status = status;
  await table.save();
  return table;
}

module.exports = {
  list, create, update, findByCodeOrId, assignToOrder, releaseFromOrder, setStatus,
};
