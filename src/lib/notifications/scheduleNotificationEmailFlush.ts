import { after } from 'next/server';

import { flushPendingNotificationEmails } from '@/lib/notifications/flushPendingNotificationEmails';

/**
 * Flush due notification email batches after the response is sent.
 * Used instead of a per-minute Vercel cron (not available on Hobby plans).
 */
export function scheduleNotificationEmailFlush(): void {
  after(async () => {
    try {
      await flushPendingNotificationEmails();
    } catch (error) {
      console.error('Background notification email flush failed:', error);
    }
  });
}
