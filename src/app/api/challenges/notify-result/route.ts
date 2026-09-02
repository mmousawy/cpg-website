import { NextRequest, NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/requireAdmin';
import { notifyChallengeSubmissionResult } from '@/lib/notifications/notifyChallengeSubmissionResult';

/**
 * POST /api/challenges/notify-result
 *
 * Sends notification to users when their submissions are accepted or rejected.
 * Prefer POST /api/challenges/review, which reviews and notifies together.
 */
export async function POST(request: NextRequest) {
  const adminResult = await requireAdminUser();
  if ('error' in adminResult) {
    return adminResult.error;
  }

  try {
    let body: {
      submissionIds?: string[];
      status?: 'accepted' | 'rejected';
      rejectionReason?: string;
      challengeSlug?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const { submissionIds, status, rejectionReason, challengeSlug } = body;

    if (!submissionIds?.length || !status || !challengeSlug) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    const result = await notifyChallengeSubmissionResult({
      actorId: adminResult.user.id,
      submissionIds,
      status,
      rejectionReason,
      challengeSlug,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in notify-result:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
