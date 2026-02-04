import { render } from '@react-email/components';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import SubmissionResultEmail from '@/emails/submission-result';
import { createNotification } from '@/lib/notifications/create';
import { encrypt } from '@/utils/encrypt';
import { createClient } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/challenges/notify-result
 *
 * Sends notification to user when their submission is accepted or rejected.
 * Called after reviewing a submission.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the requester is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      submissionIds,
      status,
      rejectionReason,
      challengeSlug,
    }: {
      submissionIds: string[];
      status: 'accepted' | 'rejected';
      rejectionReason?: string;
      challengeSlug: string;
    } = body;

    if (!submissionIds?.length || !status || !challengeSlug) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Fetch the challenge
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, title, slug')
      .eq('slug', challengeSlug)
      .single();

    if (!challenge) {
      return NextResponse.json(
        { message: 'Challenge not found' },
        { status: 404 },
      );
    }

    // Fetch submission details with user and photo info
    const { data: submissions } = await supabase
      .from('challenge_submissions')
      .select(`
        id,
        photo:photos (id, short_id, url, title),
        user:profiles!challenge_submissions_user_id_fkey (id, email, full_name, nickname)
      `)
      .in('id', submissionIds);

    if (!submissions?.length) {
      return NextResponse.json(
        { message: 'No submissions found' },
        { status: 404 },
      );
    }

    // Get the photo_challenges email type ID for opt-out check
    const { data: emailType } = await supabase
      .from('email_types')
      .select('id')
      .eq('type_key', 'photo_challenges')
      .single();

    // Get users who have opted out
    const optedOutUserIds = new Set<string>();
    if (emailType) {
      const { data: optedOut } = await supabase
        .from('email_preferences')
        .select('user_id')
        .eq('email_type_id', emailType.id)
        .eq('opted_out', true);

      if (optedOut) {
        for (const pref of optedOut) {
          optedOutUserIds.add(pref.user_id);
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const challengeLink = `${baseUrl}/challenges/${challenge.slug}`;

    // Process each submission
    const notificationsCreated: string[] = [];
    const emailsSent: string[] = [];

    for (const submission of submissions) {
      const submissionUser = submission.user as {
        id: string;
        email: string | null;
        full_name: string | null;
        nickname: string | null;
      };
      const photo = submission.photo as {
        id: string;
        short_id: string;
        url: string;
        title: string | null;
      };

      if (!submissionUser || !photo) continue;

      // Create in-app notification
      try {
        await createNotification({
          userId: submissionUser.id,
          actorId: user.id,
          type: status === 'accepted' ? 'submission_accepted' : 'submission_rejected',
          entityType: 'challenge',
          entityId: challenge.id,
          data: {
            title: challenge.title,
            photoId: photo.id,
            photoShortId: photo.short_id,
            photoTitle: photo.title,
            link: challengeLink,
            rejectionReason: status === 'rejected' ? rejectionReason : undefined,
          },
        });
        notificationsCreated.push(submissionUser.id);
      } catch (err) {
        console.error('Failed to create notification:', err);
      }

      // Send email if user hasn't opted out and has an email
      if (
        submissionUser.email &&
        !optedOutUserIds.has(submissionUser.id)
      ) {
        try {
          // Generate opt-out link
          const optOutToken = encrypt(
            JSON.stringify({
              userId: submissionUser.id,
              emailType: 'photo_challenges',
            }),
          );
          const optOutLink = `${baseUrl}/unsubscribe/${encodeURIComponent(optOutToken)}`;

          const emailHtml = await render(
            SubmissionResultEmail({
              userName: submissionUser.full_name || submissionUser.nickname || 'there',
              status,
              photoUrl: photo.url,
              photoTitle: photo.title,
              challengeTitle: challenge.title,
              challengeLink,
              rejectionReason: status === 'rejected' ? rejectionReason : undefined,
              optOutLink,
            }),
          );

          await resend.emails.send({
            from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
            replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
            to: submissionUser.email,
            subject:
              status === 'accepted'
                ? `Your photo was accepted for "${challenge.title}"!`
                : `Update on your submission to "${challenge.title}"`,
            html: emailHtml,
          });

          emailsSent.push(submissionUser.email);
        } catch (err) {
          console.error('Failed to send email:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsCreated: notificationsCreated.length,
      emailsSent: emailsSent.length,
    });
  } catch (error) {
    console.error('Error in notify-result:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
