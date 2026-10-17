'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/shared/AuthProvider';
import { errMsg } from '@/lib/api';
import LoginForm from './LoginForm';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/pos');
  }, [loading, user, router]);

  async function handleLogin(email, password) {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    if (!password) return setError('Password is required');
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/pos');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <LoginForm onSubmit={handleLogin} error={error} busy={busy} />
    </div>
  );
}
