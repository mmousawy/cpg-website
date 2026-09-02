import { NextRequest, NextResponse } from 'next/server';

import { notifyAdminsOfChallengeSubmission } from '@/lib/notifications/notifyAdminsOfChallengeSubmission';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/challenges/notify-submission
 *
 * Sends admin notifications for a challenge submission.
 * Prefer POST /api/challenges/submit, which submits and notifies together.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body: { challengeId?: string; photoIds?: string[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const { challengeId, photoIds } = body;

    if (!challengeId || !Array.isArray(photoIds) || photoIds.length === 0
      || !photoIds.every((id) => typeof id === 'string')) {
      return NextResponse.json(
        { message: 'Challenge ID and photo IDs are required' },
        { status: 400 },
      );
    }

    await notifyAdminsOfChallengeSubmission({
      submitterId: user.id,
      challengeId,
      photoIds,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in notify-submission:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
