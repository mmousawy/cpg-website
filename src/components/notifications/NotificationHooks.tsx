'use client';

import { useAutoMarkNotificationsSeen } from '@/hooks/useAutoMarkNotificationsSeen';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

/**
 * Component that runs notification-related hooks.
 * Separated to allow dynamic import with ssr: false to avoid
 * prerendering issues with Supabase Realtime subscriptions.
 */
export default function NotificationHooks() {
  // Subscribe to realtime notifications
  useRealtimeNotifications();

  // Auto-mark notifications as seen when visiting associated pages
  useAutoMarkNotificationsSeen();

  return null;
}
