const mongoose = require('mongoose');
const { Schema } = mongoose;

const PREP = ['pending', 'preparing', 'ready'];
const TICKET_STATUS = ['pending', 'in_progress', 'ready'];

const ticketItemSchema = new Schema({
  orderItemId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  prepStatus: { type: String, enum: PREP, default: 'pending' },
}, { _id: true });

const kitchenTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  items: { type: [ticketItemSchema], validate: (v) => v.length > 0 },
  kitchenNotes: { type: String, trim: true, maxlength: 500, default: '' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  readyAt: Date,
  status: { type: String, enum: TICKET_STATUS, default: 'pending', index: true },
}, { timestamps: true });

kitchenTicketSchema.index({ status: 1, createdAt: -1 });

kitchenTicketSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => {
    r.id = String(r._id);
    delete r._id;
    (r.items || []).forEach((i) => {
      if (i && i._id) { i.id = String(i._id); delete i._id; }
    });
    return r;
  },
});

module.exports = mongoose.model('KitchenTicket', kitchenTicketSchema);
module.exports.PREP = PREP;
module.exports.TICKET_STATUS = TICKET_STATUS;
