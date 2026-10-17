const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30, unique: true },
  description: { type: String, trim: true, maxlength: 200, default: '' },
  discountType: { type: String, enum: ['percent', 'flat'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxUses: { type: Number, default: null },
  usedCount: { type: Number, default: 0, min: 0 },
  validFrom: { type: Date, default: () => new Date() },
  validTo: { type: Date, default: null },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

couponSchema.index({ code: 1, isActive: 1 });

couponSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => { r.id = String(r._id); delete r._id; return r; },
});

module.exports = mongoose.model('Coupon', couponSchema);
