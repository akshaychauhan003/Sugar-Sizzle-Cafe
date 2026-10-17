const mongoose = require('mongoose');
const { Schema } = mongoose;

const STATUSES = ['available', 'occupied', 'reserved', 'cleaning'];

const tableSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20, unique: true },
  capacity: { type: Number, required: true, min: 1, max: 50, default: 4 },
  section: { type: String, trim: true, maxlength: 60, default: 'Main', index: true },
  location: { type: String, trim: true, maxlength: 60, default: '' },
  status: { type: String, enum: STATUSES, default: 'available', index: true },
  currentOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  notes: { type: String, trim: true, maxlength: 200, default: '' },
}, { timestamps: true });

tableSchema.index({ status: 1, code: 1 });
tableSchema.index({ status: 1, section: 1 });

tableSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => { r.id = String(r._id); delete r._id; return r; },
});

module.exports = mongoose.model('Table', tableSchema);
module.exports.STATUSES = STATUSES;
