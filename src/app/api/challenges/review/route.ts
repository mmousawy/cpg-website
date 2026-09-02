import { NextRequest, NextResponse } from 'next/server';

import { requireAdminUser } from '@/lib/auth/requireAdmin';
import { notifyChallengeSubmissionResult } from '@/lib/notifications/notifyChallengeSubmissionResult';
import { createClient } from '@/utils/supabase/server';

type ReviewRequest = {
  submissionIds?: string[];
  status?: 'accepted' | 'rejected';
  rejectionReason?: string;
  challengeSlug?: string;
};

export async function POST(request: NextRequest) {
  const adminResult = await requireAdminUser();
  if ('error' in adminResult) {
    return adminResult.error;
  }

  try {
    let body: ReviewRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const { submissionIds, status, rejectionReason, challengeSlug } = body;

    if (!submissionIds?.length || !status || !challengeSlug
      || (status !== 'accepted' && status !== 'rejected')
      || !submissionIds.every((id) => typeof id === 'string')) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    if (submissionIds.length === 1) {
      const { error } = await supabase.rpc('review_challenge_submission', {
        p_submission_id: submissionIds[0],
        p_status: status,
        p_rejection_reason: rejectionReason ?? undefined,
      });

      if (error) {
        console.error('Error reviewing challenge submission:', error);
        return NextResponse.json(
          { message: error.message || 'Failed to review submission' },
          { status: 400 },
        );
      }
    } else {
      const { error } = await supabase.rpc('bulk_review_challenge_submissions', {
        p_submission_ids: submissionIds,
        p_status: status,
        p_rejection_reason: rejectionReason ?? undefined,
      });

      if (error) {
        console.error('Error bulk reviewing challenge submissions:', error);
        return NextResponse.json(
          { message: error.message || 'Failed to review submissions' },
          { status: 400 },
        );
      }
    }

    try {
      await notifyChallengeSubmissionResult({
        actorId: adminResult.user.id,
        submissionIds,
        status,
        rejectionReason,
        challengeSlug,
      });
    } catch (notifyError) {
      console.error('Error notifying challenge submission result:', notifyError);
    }

    return NextResponse.json({
      count: submissionIds.length,
      challengeSlug,
    });
  } catch (error) {
    console.error('Error in challenge review:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
