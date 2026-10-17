const mongoose = require('mongoose');
const { Schema } = mongoose;

const reprintSchema = new Schema({
  at: { type: Date, default: Date.now },
  by: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  snapshot: { type: Schema.Types.Mixed, required: true },
  reprints: { type: [reprintSchema], default: [] },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

invoiceSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => { r.id = String(r._id); delete r._id; return r; },
});

module.exports = mongoose.model('Invoice', invoiceSchema);
