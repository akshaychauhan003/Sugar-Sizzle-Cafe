const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockSchema = new Schema({
  itemName: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, trim: true, default: 'General', maxlength: 60 },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, trim: true, default: 'units', maxlength: 20 },
  costPrice: { type: Number, min: 0, default: 0 },
  batchNumber: { type: String, trim: true, default: '' },
  supplier: { type: String, trim: true, default: 'Local Supplier', maxlength: 120 },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  minimumQuantity: { type: Number, default: 5 },
  wastedQuantity: { type: Number, default: 0 },
  wasteReason: { type: String, trim: true, default: '', maxlength: 200 },
  notes: { type: String, trim: true, default: '', maxlength: 500 },
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'expired', 'wasted'],
    default: 'in_stock',
    index: true,
  },
  linkedMenuItemIds: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diffTime = new Date(this.expiryDate).getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

stockSchema.virtual('expiryStatus').get(function () {
  const days = this.daysUntilExpiry;
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 5) return 'expiring_soon';
  return 'good';
});

stockSchema.virtual('colorCode').get(function () {
  const days = this.daysUntilExpiry;
  if (days !== null && days < 0) return 'red';
  if (this.quantity === 0 || this.status === 'out_of_stock' || this.status === 'expired') return 'red';
  if ((days !== null && days <= 5) || this.quantity <= (this.minimumQuantity || 5) || this.status === 'low_stock') return 'yellow';
  return 'green';
});

stockSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_d, r) => {
    r.id = String(r._id);
    delete r._id;
    return r;
  },
});

module.exports = mongoose.model('Stock', stockSchema);
