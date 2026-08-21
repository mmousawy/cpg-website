import { NextRequest, NextResponse } from 'next/server';

import { flushPendingNotificationEmails } from '@/lib/notifications/flushPendingNotificationEmails';
import { flushPendingNotifications } from '@/lib/notifications/schedule';
import { expireTags, revalidateHomeCache } from '@/lib/cache/expireTag';
import { safeEqualSecret } from '@/utils/security';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!safeEqualSecret(token ?? undefined, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  expireTags(['events', 'event-attendees', 'challenges']);
  revalidateHomeCache();

  let notificationEmails = { sent: 0, cancelled: 0, failed: 0, processed: 0 };
  let pendingNotifications = { delivered: 0, failed: 0, processed: 0 };
  try {
    pendingNotifications = await flushPendingNotifications();
    notificationEmails = await flushPendingNotificationEmails();
  } catch (error) {
    console.error('Error flushing pending notifications:', error);
  }

  return NextResponse.json({
    revalidated: true,
    pendingNotifications,
    notificationEmails,
    now: new Date().toISOString(),
  });
}
