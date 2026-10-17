const mongoose = require('mongoose');
const { Schema } = mongoose;

const movementSchema = new Schema({
  type: { type: String, enum: ['in', 'out'], required: true },
  amount: { type: Number, required: true, min: 0 },
  note: { type: String, trim: true, maxlength: 200, default: '' },
  at: { type: Date, default: Date.now },
  by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: true });

const shiftSchema = new mongoose.Schema({
  shiftNumber: { type: String, required: true, unique: true },
  openedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  closedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  openingCash: { type: Number, required: true, min: 0, default: 0 },
  expectedCash: { type: Number, default: 0 },
  actualCash: { type: Number, default: null },
  cashVariance: { type: Number, default: 0 },
  cashMovements: { type: [movementSchema], default: [] },
  totals: {
    cash: { type: Number, default: 0 },
    upi: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
  },
  orderCount: { type: Number, default: 0 },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['open', 'reconciling', 'locked'], default: 'open', index: true },
  lockedAt: Date,
  lockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  openedAt: { type: Date, default: Date.now },
  closedAt: Date,
}, { timestamps: true });

shiftSchema.index({ status: 1, openedAt: -1 });

shiftSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => { r.id = String(r._id); delete r._id; return r; },
});

module.exports = mongoose.model('Shift', shiftSchema);
