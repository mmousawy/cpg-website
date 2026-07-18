import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { createNoIndexMetadata } from '@/utils/metadata';
import { getServerAuth } from '@/utils/supabase/getServerAuth';

export const metadata = createNoIndexMetadata({
  title: 'Admin',
  description: 'Admin dashboard for Creative Photography Group',
});

async function AdminConnection() {
  // Opt out of static generation - admin pages require authentication
  await connection();
  return null;
}

async function AdminRoleGuard() {
  const { user, profile } = await getServerAuth();

  // Unauthenticated users are redirected to login by proxy middleware
  if (user && profile && !profile.is_admin) {
    redirect('/');
  }

  return null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Suspense
        fallback={null}
      >
        <AdminConnection />
      </Suspense>
      <Suspense
        fallback={null}
      >
        <AdminRoleGuard />
      </Suspense>
      {children}
    </>
  );
}
