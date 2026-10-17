const AuditLog = require('../models/AuditLog');

/**
 * Persist an audit entry. Never throws to callers — failures are logged only.
 * Signature: log(user, action, entityType, entityId, summary, meta)
 */
async function log(user, action, entityType, entityId, summary, meta) {
  try {
    // Support both positional and legacy object form: log(user, { action, ... })
    if (action && typeof action === 'object' && !entityType) {
      const o = action;
      action = o.action;
      entityType = o.entityType;
      entityId = o.entityId;
      summary = o.summary;
      meta = o.meta;
    }
    await AuditLog.create({
      user: user?._id || user || undefined,
      action,
      entityType,
      entityId: entityId || undefined,
      summary: summary || action,
      meta: meta || undefined,
    });
  } catch (e) {
    console.warn('Audit log failed:', e.message);
  }
}

async function list({ page = 1, limit = 20, user, entityType, action } = {}) {
  const filter = {};
  if (user) filter.user = user;
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;
  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('user', 'name email role'),
    AuditLog.countDocuments(filter),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

module.exports = { log, list };
