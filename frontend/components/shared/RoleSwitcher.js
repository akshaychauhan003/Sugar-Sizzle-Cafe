'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useToast } from './AuthProvider';
import { ROLE_ICONS, ROLE_LABELS, errMsg } from '@/lib/api';

export default function RoleSwitcher({ selectableRoles = [], currentRole, variant = 'navbar' }) {
  const { switchRole } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  async function handleSwitch(newRole) {
    if (newRole === currentRole) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setOpen(false);
    try {
      await switchRole(newRole);
      toast(`Active role changed to ${ROLE_LABELS[newRole] || newRole}`);
      if (newRole === 'kitchen') router.push('/kitchen');
      else if (newRole === 'cashier') router.push('/pos');
      else if (newRole === 'staff') router.push('/orders');
      else if (newRole === 'admin') router.push('/reports');
    } catch (err) {
      toast(errMsg(err), 'err');
    } finally {
      setSwitching(false);
    }
  }

  if (!selectableRoles || selectableRoles.length <= 1) return null;

  return (
    <div ref={containerRef} className={`role-switcher-container ${variant}`}>
      <button
        type="button"
        className={`role-switcher-trigger ${open ? 'open' : ''} ${switching ? 'busy' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Switch active role without logging out"
      >
        <span className="role-switcher-label">Switch:</span>
        <span className="role-switcher-current">
          <span className="role-curr-icon">{ROLE_ICONS[currentRole] || '👤'}</span>
          <span className="role-curr-text">{ROLE_LABELS[currentRole] || currentRole}</span>
        </span>
        <span className={`role-switcher-arrow ${open ? 'rotated' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="role-switcher-dropdown-panel" role="listbox">
          <div className="role-dropdown-header">
            <span>SWITCH WORKING ROLE</span>
          </div>
          {selectableRoles.map((r) => {
            const isSelected = r === currentRole;
            return (
              <button
                key={r}
                type="button"
                className={`role-dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSwitch(r)}
                role="option"
                aria-selected={isSelected}
              >
                <span className="role-item-icon">{ROLE_ICONS[r] || '👤'}</span>
                <span className="role-item-text">{ROLE_LABELS[r] || r}</span>
                {isSelected ? (
                  <span className="role-item-check">✓</span>
                ) : (
                  <span className="role-item-badge">Switch</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
