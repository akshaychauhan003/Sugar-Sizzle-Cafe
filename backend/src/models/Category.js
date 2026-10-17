const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  displayOrder: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

categorySchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => { r.id = String(r._id); delete r._id; return r; },
});

module.exports = mongoose.model('Category', categorySchema);
