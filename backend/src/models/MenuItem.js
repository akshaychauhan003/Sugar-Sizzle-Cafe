const mongoose = require('mongoose');
const { Schema } = mongoose;

const modifierSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  price: { type: Number, required: true, min: 0, default: 0 },
}, { _id: false });

const recipeItemSchema = new Schema({
  stockItem: { type: Schema.Types.ObjectId, ref: 'Stock' },
  stockItemName: { type: String, trim: true, default: '' },
  quantityRequired: { type: Number, min: 0.01, default: 1 },
  unit: { type: String, trim: true, default: 'units' },
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  sku: { type: String, trim: true, uppercase: true, maxlength: 30, unique: true, sparse: true },
  category: { type: String, required: true, trim: true, maxlength: 60, index: true }, // string kept for compat
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, min: 0, default: null, select: false },
  prepTimeMin: { type: Number, min: 0, max: 240, default: 10 },
  imageUrl: { type: String, trim: true, maxlength: 500, default: '' },
  recipe: { type: String, trim: true, maxlength: 2000, default: '' },
  recipeItems: { type: [recipeItemSchema], default: [] },
  modifiers: { type: [modifierSchema], default: [] },
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock',
    index: true,
  },
  inventoryQuantity: { type: Number, min: 0, default: null },
  isAvailable: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

menuItemSchema.index({ name: 1 });
menuItemSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => { r.id = String(r._id); delete r._id; return r; },
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
