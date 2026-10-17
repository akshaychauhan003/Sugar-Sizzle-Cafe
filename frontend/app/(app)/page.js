'use client';
import { useAuth } from '@/components/shared/AuthProvider';
import DashboardPage from '@/components/pages/dashboard';
import PosPage from '@/components/pages/pos';
import KitchenPage from '@/components/pages/kitchen';
import OrdersPage from '@/components/pages/orders';
import { Spinner } from '@/components/shared/ui';

export default function Page() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user?.role === 'admin') return <DashboardPage />;
  if (user?.role === 'kitchen') return <KitchenPage />;
  if (user?.role === 'staff') return <OrdersPage />;
  return <PosPage />;
}
