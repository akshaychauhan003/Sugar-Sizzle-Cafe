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

  function getRoleHome(role) {
    if (role === 'admin') return '/reports';
    if (role === 'kitchen') return '/kitchen';
    if (role === 'staff') return '/orders';
    return '/pos';
  }

  useEffect(() => {
    if (!loading && user) router.replace(getRoleHome(user.role));
  }, [loading, user, router]);

  async function handleLogin(email, password) {
    if (!email || !email.trim()) return setError('Enter your User ID or email address');
    if (!password) return setError('Password is required');
    setBusy(true);
    setError('');
    try {
      const loggedUser = await login(email, password);
      router.replace(getRoleHome(loggedUser?.role));
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
