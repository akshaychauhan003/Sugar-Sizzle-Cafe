const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new mongoose.Schema({
  paymentRef: { type: String, required: true, unique: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  amountMinor: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'upi', 'card'], required: true },
  status: { type: String, enum: ['recorded', 'refunded'], default: 'recorded', index: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  transactionRef: { type: String, trim: true, maxlength: 100, default: '' },
  idempotencyKey: { type: String, trim: true, maxlength: 100 },
}, { timestamps: true });

paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index(
  { recordedBy: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

paymentSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => {
    r.id = String(r._id);
    delete r._id;
    delete r.amountMinor;
    delete r.idempotencyKey;
    return r;
  },
});

module.exports = mongoose.model('Payment', paymentSchema);
