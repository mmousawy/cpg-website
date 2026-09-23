'use client';

import dynamic from 'next/dynamic';

import ReduceMotionSync from '@/components/layout/ReduceMotionSync';
import SupabaseProvider from '@/app/providers/SupabaseProvider';
import { AuthProvider } from '@/context/AuthContext';
import { useSession } from '@/context/SessionContext';

const QueryProvider = dynamic(
  () => import('@/app/providers/QueryProvider'),
  { ssr: true },
);

type AuthenticatedProvidersProps = {
  children: React.ReactNode;
};

export default function AuthenticatedProviders({
  children,
}: AuthenticatedProvidersProps) {
  const { user, profile } = useSession();
  const initialAuth = { user, profile };

  return (
    <SupabaseProvider>
      <QueryProvider>
        <AuthProvider
          initialAuth={initialAuth}
        >
          <ReduceMotionSync />
          {children}
        </AuthProvider>
      </QueryProvider>
    </SupabaseProvider>
  );
}
