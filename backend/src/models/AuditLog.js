const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, trim: true, maxlength: 80, index: true },
  entityType: { type: String, required: true, trim: true, maxlength: 60, index: true },
  entityId: { type: Schema.Types.ObjectId, default: null },
  summary: { type: String, trim: true, maxlength: 300, default: '' },
  meta: { type: Schema.Types.Mixed },
}, { timestamps: true });

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

auditLogSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => { r.id = String(r._id); delete r._id; return r; },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
