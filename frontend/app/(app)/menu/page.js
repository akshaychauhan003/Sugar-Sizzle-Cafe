import { Suspense } from 'react';
import MenuPage from '@/components/pages/menu';
import { Spinner } from '@/components/shared/ui';

export const metadata = {
  title: 'Menu Management — Sugar & Sizzle Café',
};

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <MenuPage />
    </Suspense>
  );
}
