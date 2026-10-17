'use client';
import { useState } from 'react';
import { api, errMsg } from '@/lib/api';
import { useToast } from './AuthProvider';
import { Modal } from './ui';
import PasswordInput from './PasswordInput';

export default function ChangePasswordModal({ onClose }) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Password confirmation check
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;
  const isMatchError = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isLengthValid = newPassword.length >= 8;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      return setError('New password must be at least 8 characters long');
    }

    if (newPassword !== confirmPassword) {
      return setError('New password and Confirm password do not match');
    }

    setBusy(true);
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: {
          ...(currentPassword.trim() ? { currentPassword: currentPassword.trim() } : {}),
          newPassword,
          confirmPassword,
        },
      });
      toast('Password updated successfully');
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Update Account Password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="stack">
        <p className="muted small">
          Enter your new password and re-enter it to confirm. Use the eye symbol to inspect what you type.
        </p>

        {error && (
          <div className="errbox" role="alert">
            {error}
          </div>
        )}

        <PasswordInput
          id="currentPassword"
          label="Current Password (Optional)"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password if known"
          autoComplete="current-password"
        />

        <PasswordInput
          id="newPassword"
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          helperText={newPassword.length > 0 && !isLengthValid ? 'Must be at least 8 characters' : ''}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          required
          minLength={8}
          autoComplete="new-password"
          error={isMatchError ? 'Passwords do not match' : ''}
          helperText={confirmPassword && !isMatchError ? '✓ Passwords match' : ''}
        />

        <div className="row end" style={{ marginTop: '12px' }}>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={busy || !newPassword || !confirmPassword || !isLengthValid || !passwordsMatch}
          >
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
