import { NextRequest, NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/requireAdmin';
import { notifyReportResolved } from '@/lib/notifications/notifyReportResolved';
import { createClient } from '@/utils/supabase/server';

type ResolveRequest = {
  reportIds?: string[];
  reportId?: string;
  status?: 'resolved' | 'dismissed';
  adminNotes?: string;
  resolutionType?: string;
};

export async function POST(request: NextRequest) {
  const adminResult = await requireAdminUser();
  if ('error' in adminResult) {
    return adminResult.error;
  }

  try {
    let body: ResolveRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const status = body.status;
    const reportIds = body.reportIds
      ?? (body.reportId ? [body.reportId] : []);

    if (!reportIds.length || !reportIds.every((id) => typeof id === 'string')
      || (status !== 'resolved' && status !== 'dismissed')) {
      return NextResponse.json(
        { message: 'Report IDs and a valid status are required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminResult.user.id,
        admin_notes: body.adminNotes || null,
      })
      .in('id', reportIds);

    if (error) {
      console.error('Error resolving reports:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to resolve reports' },
        { status: 400 },
      );
    }

    if (status === 'resolved') {
      for (const reportId of reportIds) {
        try {
          await notifyReportResolved(reportId, body.resolutionType, body.adminNotes);
        } catch (notifyError) {
          console.error('Error notifying reporter of resolved report:', notifyError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: reportIds.length,
    });
  } catch (error) {
    console.error('Error in report resolve:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
