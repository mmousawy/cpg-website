'use client';

import dynamic from 'next/dynamic';

import { useSession } from '@/hooks/useSession';

const NotificationButton = dynamic(
  () => import('../notifications/NotificationButton'),
  {
    ssr: false,
    loading: () => (
      <div
        className="size-10 animate-pulse rounded-full bg-background-medium"
        aria-hidden
      />
    ),
  },
);

/** Session-dependent. The shell around it is prerendered; this slot fills in on the client. */
export default function HeaderNotifications() {
  const { user } = useSession();
  if (!user) return null;
  return <NotificationButton />;
}
