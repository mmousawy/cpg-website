'use client';

import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

/**
 * Component that runs notification-related hooks.
 * Separated to allow dynamic import with ssr: false to avoid
 * prerendering issues with Supabase Realtime subscriptions.
 */
export default function NotificationHooks() {
  useRealtimeNotifications();

  return null;
}
