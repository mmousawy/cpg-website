import { Suspense } from 'react';

import PageLoading from '@/components/shared/PageLoading';

import ActivityContent from './ActivityContent';

// Auth is enforced by proxy middleware and AccountAuthGuard in the account layout.
// ActivityContent is a client component that uses useAuth for user-specific data.
export default function ActivityPage() {
  return (
    <Suspense
      fallback={<PageLoading />}
    >
      <ActivityContent />
    </Suspense>
  );
}
