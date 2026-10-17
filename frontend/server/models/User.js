const mongoose = require('mongoose');
const { ROLES } = require('../lib/roles');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, trim: true, lowercase: true, unique: true, sparse: true, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, default: 'staff', index: true },
  roles: { type: [String], default: [] },
  activeRole: { type: String, default: null },
  phone: { type: String, trim: true, default: '' },
  branch: { type: String, trim: true, default: 'Main' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, r) => {
    r.id = String(r._id);
    delete r._id;
    delete r.passwordHash;
    if (!r.username) {
      r.username = r.email ? r.email.split('@')[0] : '';
    }
    if (!r.roles || !r.roles.length) {
      r.roles = r.role ? [r.role] : ['staff'];
    }
    if (r.activeRole) {
      r.role = r.activeRole;
    }
    return r;
  },
});

module.exports = mongoose.model('User', userSchema);
