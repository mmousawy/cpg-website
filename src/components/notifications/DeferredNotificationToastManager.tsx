'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { scheduleIdleWork } from '@/utils/scheduleIdle';

const NotificationToastManager = dynamic(
  () => import('./NotificationToastManager'),
  { ssr: false },
);

/** Defers notification realtime hooks until after first paint. */
export default function DeferredNotificationToastManager() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    scheduleIdleWork(() => setReady(true), 3000);
  }, []);

  if (!ready) return null;

  return <NotificationToastManager />;
}
