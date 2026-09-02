import { NextRequest, NextResponse } from 'next/server';

import { notifyAdminsOfChallengeSubmission } from '@/lib/notifications/notifyAdminsOfChallengeSubmission';
import { createClient } from '@/utils/supabase/server';

type SubmitRequest = {
  challengeId?: string;
  photoIds?: string[];
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body: SubmitRequest;
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

    const { data, error } = await supabase.rpc('submit_to_challenge', {
      p_challenge_id: challengeId,
      p_photo_ids: photoIds,
    });

    if (error) {
      console.error('Error submitting to challenge:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to submit to challenge' },
        { status: 400 },
      );
    }

    const submittedCount = data ?? 0;

    if (submittedCount > 0) {
      try {
        await notifyAdminsOfChallengeSubmission({
          submitterId: user.id,
          challengeId,
          photoIds,
        });
      } catch (notifyError) {
        console.error('Error notifying admins of challenge submission:', notifyError);
      }
    }

    return NextResponse.json({ submittedCount });
  } catch (error) {
    console.error('Error in challenge submit:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
