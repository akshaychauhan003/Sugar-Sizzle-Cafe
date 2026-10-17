'use client';
import { useState } from 'react';
import DemoAccountsBadge from './DemoAccountsBadge';
import PasswordInput from '@/components/shared/PasswordInput';

export default function LoginForm({ onSubmit, error, busy }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(email, password);
  }

  function handleFill(e, p) {
    setEmail(e);
    setPassword(p);
  }

  return (
    <div className="login-card-container">
      <form className="card login-card" onSubmit={handleSubmit} noValidate>
        <div className="brand" style={{ marginBottom: 18, justifyContent: 'center' }}>
          <span className="logo">☕</span>
          <div>
            <b>Sugar &amp; Sizzle Café</b>
            <small>ARTISAN COFFEE &amp; KITCHEN</small>
          </div>
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '4px' }}>Café POS Terminal Sign In</h2>
        <p className="muted small" style={{ textAlign: 'center', margin: '0 0 16px' }}>
          Enter staff credentials to access the terminal
        </p>

        <label>
          User ID or Email
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            placeholder="e.g. admin, cashier, chef, or staff"
          />
        </label>

        <PasswordInput
          id="loginPassword"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />

        {error && (
          <div className="errbox" role="alert">
            {error}
          </div>
        )}

        <button className="btn primary block" disabled={busy} style={{ minHeight: '46px', fontSize: '0.98rem' }}>
          {busy ? 'Signing in…' : 'Sign In to Terminal'}
        </button>

        <DemoAccountsBadge onSelect={handleFill} selectedEmail={email} />
      </form>
    </div>
  );
}
