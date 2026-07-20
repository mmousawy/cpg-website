import { NextRequest, NextResponse } from 'next/server';

import { flushPendingNotificationEmails } from '@/lib/notifications/flushPendingNotificationEmails';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json(
      { message: 'Cron secret not configured' },
      { status: 500 },
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const result = await flushPendingNotificationEmails();

    return NextResponse.json({
      message: 'Pending notification emails processed',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: 'Failed to fetch pending batches', error: message },
      { status: 500 },
    );
  }
}
