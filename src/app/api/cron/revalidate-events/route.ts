import { NextRequest, NextResponse } from 'next/server';

import { flushPendingNotificationEmails } from '@/lib/notifications/flushPendingNotificationEmails';
import { revalidateTag } from 'next/cache';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('events', 'max');
  revalidateTag('home', 'max');

  let notificationEmails = { sent: 0, cancelled: 0, failed: 0, processed: 0 };
  try {
    notificationEmails = await flushPendingNotificationEmails();
  } catch (error) {
    console.error('Error flushing pending notification emails:', error);
  }

  return NextResponse.json({
    revalidated: true,
    notificationEmails,
    now: new Date().toISOString(),
  });
}
