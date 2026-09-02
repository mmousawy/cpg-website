import { NextRequest, NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/requireAdmin';
import { notifyReportResolved } from '@/lib/notifications/notifyReportResolved';

/**
 * POST /api/reports/resolved/notify
 *
 * Sends notification to the reporter when a report is resolved.
 * Prefer POST /api/reports/resolve, which resolves and notifies together.
 */
export async function POST(request: NextRequest) {
  const adminResult = await requireAdminUser();
  if ('error' in adminResult) {
    return adminResult.error;
  }

  try {
    const body = await request.json();
    const { reportId, resolutionType, message } = body as {
      reportId: string;
      resolutionType?: string;
      message?: string;
    };

    if (!reportId) {
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 },
      );
    }

    const result = await notifyReportResolved(reportId, resolutionType, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Report resolved notification error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 },
    );
  }
}
