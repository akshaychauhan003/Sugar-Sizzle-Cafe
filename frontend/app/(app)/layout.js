import { Suspense } from 'react';
import AppShell from '@/components/shared/AppShell';
import { Spinner } from '@/components/shared/ui';

export default function AppLayout({ children }) {
  return (
    <Suspense fallback={<Spinner />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
