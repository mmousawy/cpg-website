import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { createNoIndexMetadata } from '@/utils/metadata';
import { connection } from 'next/server';

export const metadata = createNoIndexMetadata({
  title: 'Admin',
  description: 'Admin dashboard for Creative Photography Group',
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Opt out of static generation - admin pages require authentication
  await connection();

  return <ProtectedRoute
    requireAdmin
  >
    {children}
  </ProtectedRoute>;
}
