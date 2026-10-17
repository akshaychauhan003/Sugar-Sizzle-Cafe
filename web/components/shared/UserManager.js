'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errMsg, ROLE_ICONS, ROLE_LABELS } from '@/lib/api';
import { useAuth, useToast } from '@/components/shared/AuthProvider';
import { ErrorBox, Modal, Spinner } from '@/components/shared/ui';
import PasswordInput from '@/components/shared/PasswordInput';

const AVAILABLE_ROLES = [
  { id: 'admin', label: 'Admin', desc: 'Full administration, stocks, dish pricing, reports, user roles' },
  { id: 'cashier', label: 'Cashier', desc: 'POS order register, price calculation, payment recording, receipts' },
  { id: 'kitchen', label: 'Kitchen / Chef', desc: 'KDS cooking queue, order prep, stock details with expiry' },
  { id: 'staff', label: 'Waitstaff', desc: 'View cooking & cooked items with order/table #, deliver to customer' },
];

export default function UserManager() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [busy, setBusy] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState(['staff']);

  // Edit user state
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState([]);
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const res = await api('/users');
      setUsers(res.data || []);
      setErr('');
    } catch (e) {
      setErr(errMsg(e));
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function toggleRole(roleId, isEdit = false) {
    if (isEdit) {
      setEditRoles((prev) =>
        prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
      );
    } else {
      setSelectedRoles((prev) =>
        prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
      );
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      return toast('Name and email are required', 'err');
    }
    if (newPassword.length < 8) {
      return toast('Password must be at least 8 characters long', 'err');
    }
    if (newPassword !== newConfirmPassword) {
      return toast('New password and confirm password do not match', 'err');
    }
    if (!selectedRoles.length) {
      return toast('Please select at least one role for this user', 'err');
    }

    setBusy(true);
    try {
      await api('/users', {
        method: 'POST',
        body: {
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          roles: selectedRoles,
          role: selectedRoles[0],
        },
      });
      toast(`User "${newName}" created successfully with ${selectedRoles.length} role(s)`);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewConfirmPassword('');
      setSelectedRoles(['staff']);
      await loadUsers();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(u) {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditRoles(u.roles && u.roles.length ? u.roles : [u.role || 'staff']);
    setEditActive(u.isActive !== false);
    setEditPassword('');
    setEditConfirmPassword('');
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    if (!editingUser) return;
    if (!editRoles.length) {
      return toast('User must have at least one assigned role', 'err');
    }
    if (editPassword) {
      if (editPassword.length < 8) {
        return toast('Password must be at least 8 characters long', 'err');
      }
      if (editPassword !== editConfirmPassword) {
        return toast('Password and confirm password do not match', 'err');
      }
    }

    setBusy(true);
    try {
      const body = {
        name: editName.trim(),
        roles: editRoles,
        role: editRoles[0],
        isActive: editActive,
      };
      if (editPassword) body.password = editPassword;

      await api(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body,
      });
      toast(`User "${editName}" updated successfully`);
      setEditingUser(null);
      await loadUsers();
    } catch (e) {
      toast(errMsg(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  const filteredUsers = (users || []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u.roles || []).some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ marginTop: '14px' }}>
      {/* Header */}
      <div className="row between wrap" style={{ marginBottom: '14px', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--espresso)' }}>Staff &amp; Multi-Role Management</h3>
          <p className="muted small" style={{ margin: '2px 0 0' }}>
            Assign multiple operational roles to a single user account and manage access credentials
          </p>
        </div>
        <div className="row" style={{ gap: '8px' }}>
          <button className="btn" onClick={loadUsers}>
            ↻ Refresh
          </button>
          <button className="btn primary" onClick={() => setShowAddModal(true)}>
            + Add New User &amp; Assign Roles
          </button>
        </div>
      </div>

      {err && <ErrorBox message={err} onRetry={loadUsers} />}

      {/* Search */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: '14px' }}>
        <input
          placeholder="Search by staff name, user ID (email), or assigned role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', minHeight: '38px' }}
        />
      </div>

      {/* Users Table */}
      {!users ? (
        <Spinner />
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👥</div>
          <b>No users found matching your search.</b>
        </div>
      ) : (
        <div className="card tablewrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', padding: 0 }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1.5px solid var(--border-light)' }}>
                <th style={{ padding: '10px 14px' }}>Staff Name</th>
                <th style={{ padding: '10px 14px' }}>Username / User ID</th>
                <th style={{ padding: '10px 14px' }}>Assigned Roles (Multi-Role)</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const assignedRoles = (u.roles && u.roles.length) ? u.roles : [u.role || 'staff'];
                const isSelf = String(currentUser?.id) === String(u.id);

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
                        <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                          {u.name ? u.name.slice(0, 1).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <b style={{ color: 'var(--espresso)', display: 'block' }}>{u.name}</b>
                          {isSelf && <span className="small muted">(You)</span>}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: '0.82rem', background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                        {u.email}
                      </code>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div className="row wrap" style={{ gap: '5px' }}>
                        {assignedRoles.map((r) => (
                          <span
                            key={r}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: r === 'admin' ? 'rgba(217, 119, 6, 0.15)' : 'var(--cream)',
                              border: r === 'admin' ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid var(--border-light)',
                              color: r === 'admin' ? '#92400e' : 'var(--espresso)',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            <span>{ROLE_ICONS[r] || '👤'}</span>
                            <span>{ROLE_LABELS[r] || r}</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {u.isActive !== false ? (
                        <span className="badge st-completed">Active</span>
                      ) : (
                        <span className="badge st-cancelled">Disabled</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button type="button" className="btn sm" onClick={() => startEdit(u)}>
                        Edit Roles / Info
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <Modal title="Create User & Assign Roles" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreateUser} className="stack">
            <p className="muted small">
              Create credentials for staff and check all operational roles this user is authorized to perform.
            </p>

            <label>
              Full Name *
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Maya Lin"
                autoFocus
              />
            </label>

            <label>
              Username / User ID (Email) *
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. maya@restoflow.test"
              />
            </label>

            <PasswordInput
              id="newAccountPassword"
              label="Password (min 8 characters) *"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />

            <PasswordInput
              id="newAccountConfirmPassword"
              label="Confirm Password *"
              value={newConfirmPassword}
              onChange={(e) => setNewConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              error={
                newConfirmPassword && newPassword !== newConfirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
              helperText={
                newConfirmPassword && newPassword === newConfirmPassword
                  ? '✓ Passwords match'
                  : ''
              }
            />

            <div>
              <b style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem' }}>
                Assign Roles (Select 1 or Multiple Roles) *
              </b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {AVAILABLE_ROLES.map((r) => {
                  const checked = selectedRoles.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: checked ? '1.5px solid var(--coffee)' : '1px solid var(--border-light)',
                        background: checked ? 'var(--cream)' : 'var(--surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(r.id, false)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <b>
                          {ROLE_ICONS[r.id]} {r.label}
                        </b>
                        <p className="muted small" style={{ margin: '1px 0 0', fontSize: '0.76rem' }}>
                          {r.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="row end" style={{ marginTop: '12px', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setShowAddModal(false)} disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={
                  busy ||
                  !newName.trim() ||
                  !newEmail.trim() ||
                  newPassword.length < 8 ||
                  newPassword !== newConfirmPassword ||
                  !selectedRoles.length
                }
              >
                {busy ? 'Creating User…' : 'Create User & Assign Roles'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal title={`Edit Staff: ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={handleUpdateUser} className="stack">
            <label>
              Full Name
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>

            <div>
              <b style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem' }}>
                Assigned Operational Roles (Check all that apply)
              </b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {AVAILABLE_ROLES.map((r) => {
                  const checked = editRoles.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: checked ? '1.5px solid var(--coffee)' : '1px solid var(--border-light)',
                        background: checked ? 'var(--cream)' : 'var(--surface)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(r.id, true)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <b>
                          {ROLE_ICONS[r.id]} {r.label}
                        </b>
                        <p className="muted small" style={{ margin: '1px 0 0', fontSize: '0.76rem' }}>
                          {r.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '6px' }}>
              <p className="muted small" style={{ marginBottom: '8px' }}>
                Optional: Update or reset account password
              </p>
              <PasswordInput
                id="editPassword"
                label="New Password (leave empty to keep current)"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                minLength={8}
              />

              {editPassword && (
                <PasswordInput
                  id="editConfirmPassword"
                  label="Confirm New Password"
                  value={editConfirmPassword}
                  onChange={(e) => setEditConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={8}
                  error={
                    editConfirmPassword && editPassword !== editConfirmPassword
                      ? 'Passwords do not match'
                      : ''
                  }
                  helperText={
                    editConfirmPassword && editPassword === editConfirmPassword
                      ? '✓ Passwords match'
                      : ''
                  }
                />
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
              />
              <b>Account is active (can sign in)</b>
            </label>

            <div className="row end" style={{ marginTop: '14px', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setEditingUser(null)} disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={
                  busy ||
                  !editName.trim() ||
                  !editRoles.length ||
                  (editPassword && (editPassword.length < 8 || editPassword !== editConfirmPassword))
                }
              >
                {busy ? 'Saving Changes…' : 'Save User & Roles'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
