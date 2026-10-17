const mongoose = require('mongoose');
const { STATUSES } = require('../services/orderStatus');
const { Schema } = mongoose;

const itemSchema = new Schema({
  menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  sku: String,
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  lineTotal: { type: Number, required: true },
}, { _id: true });

const paymentSchema = new Schema({
  method: { type: String, enum: ['cash', 'upi', 'card'], required: true },
  amount: { type: Number, required: true },
  amountMinor: { type: Number, required: true },
  reference: { type: String, default: '' },
  idempotencyKey: { type: String },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
}, { _id: true });

const historySchema = new Schema({
  status: { type: String, enum: STATUSES, required: true },
  by: { type: Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
  note: String,
}, { _id: false });

const returnItemSchema = new Schema({
  menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
  restocked: { type: Boolean, default: true },
}, { _id: false });

const salesReturnSchema = new Schema({
  returnNumber: { type: String, required: true },
  items: [returnItemSchema],
  refundAmount: { type: Number, required: true },
  refundAmountMinor: { type: Number, required: true },
  reason: { type: String, default: 'Customer Return' },
  restocked: { type: Boolean, default: true },
  returnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  returnedAt: { type: Date, default: Date.now },
}, { _id: true });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  type: { type: String, enum: ['dine-in', 'takeaway'], required: true, index: true },
  tableNumber: { type: String, default: null },
  tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null, index: true },
  customerName: { type: String, default: '', trim: true },
  notes: { type: String, default: '' },
  items: { type: [itemSchema], validate: (v) => v.length > 0 },
  discount: { type: { type: String, enum: ['percent', 'flat'] }, value: Number },
  couponCode: { type: String, trim: true, uppercase: true, default: null },
  couponDiscountAmount: { type: Number, default: 0 },
  taxRate: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, required: true },
  total: { type: Number, required: true },
  totalMinor: { type: Number, required: true },
  amountPaidMinor: { type: Number, default: 0 },
  totalRefundedMinor: { type: Number, default: 0 },
  isReturned: { type: Boolean, default: false, index: true },
  returns: [salesReturnSchema],
  status: { type: String, enum: STATUSES, default: 'pending', index: true },
  statusHistory: [historySchema],
  payments: [paymentSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  idempotencyKey: { type: String, select: false },
  isConfirmed: { type: Boolean, default: false, index: true },
  confirmedAt: Date,
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  acceptedAt: Date,
  preparedAt: Date,
  preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  acceptedForDeliveryBy: { type: Schema.Types.ObjectId, ref: 'User' },
  acceptedForDeliveryAt: Date,
  deliveredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deliveredAt: Date,
  servedAt: Date,
  completedAt: Date,
}, { timestamps: true });

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, isConfirmed: 1 });
orderSchema.index({ createdBy: 1, idempotencyKey: 1 }, {
  unique: true,
  partialFilterExpression: { idempotencyKey: { $type: 'string' } },
});

orderSchema.virtual('amountPaid').get(function () { return this.amountPaidMinor / 100; });
orderSchema.virtual('totalRefunded').get(function () { return (this.totalRefundedMinor || 0) / 100; });
orderSchema.virtual('balanceDue').get(function () {
  return Math.max(this.totalMinor - this.amountPaidMinor, 0) / 100;
});
orderSchema.virtual('paymentStatus').get(function () {
  if (this.amountPaidMinor <= 0) return this.totalRefundedMinor > 0 ? 'refunded' : 'unpaid';
  return this.amountPaidMinor >= this.totalMinor ? 'paid' : 'partial';
});

orderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_d, r) => {
    r.id = String(r._id);
    delete r._id;
    delete r.idempotencyKey;
    delete r.totalMinor;
    delete r.amountPaidMinor;
    delete r.totalRefundedMinor;
    (r.payments || []).forEach((p) => { delete p.amountMinor; delete p.idempotencyKey; });
    (r.returns || []).forEach((ret) => { delete ret.refundAmountMinor; });
    return r;
  },
});

module.exports = mongoose.model('Order', orderSchema);

