import { after } from 'next/server';

import { flushPendingNotificationEmails } from '@/lib/notifications/flushPendingNotificationEmails';
import { flushPendingNotifications } from '@/lib/notifications/schedule';

/**
 * Flush due notification email batches and in-app pending notifications after the response is sent.
 * Used instead of a per-minute Vercel cron (not available on Hobby plans).
 */
export function scheduleNotificationEmailFlush(): void {
  after(async () => {
    try {
      await flushPendingNotifications();
      await flushPendingNotificationEmails();
    } catch (error) {
      console.error('Background notification flush failed:', error);
    }
  });
}
