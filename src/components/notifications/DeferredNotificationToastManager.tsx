'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { scheduleIdleWork } from '@/utils/scheduleIdle';
import { supabase } from '@/utils/supabase/client';

const NotificationToastManager = dynamic(
  () => import('./NotificationToastManager'),
  { ssr: false },
);

/** Defers notification realtime hooks until after first paint for signed-in users. */
export default function DeferredNotificationToastManager() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    scheduleIdleWork(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled && session?.user) {
          setReady(true);
        }
      });
    }, 3000);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return <NotificationToastManager />;
}
