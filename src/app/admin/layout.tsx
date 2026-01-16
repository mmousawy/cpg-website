import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { createNoIndexMetadata } from '@/utils/metadata';

export const metadata = createNoIndexMetadata({
  title: 'Admin',
  description: 'Admin dashboard for Creative Photography Group',
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
}
