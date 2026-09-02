import { Resend } from 'resend';
import { render } from '@react-email/render';

import SubmissionResultEmail from '@/emails/submission-result';
import { createNotification } from '@/lib/notifications/create';
import { isTestEmail } from '@/lib/auth/isTestEmail';
import { encrypt } from '@/utils/encrypt';
import { adminSupabase } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyChallengeSubmissionResult(params: {
  actorId: string;
  submissionIds: string[];
  status: 'accepted' | 'rejected';
  rejectionReason?: string;
  challengeSlug: string;
}): Promise<{ notificationsCreated: number; emailsSent: number }> {
  const { actorId, submissionIds, status, rejectionReason, challengeSlug } = params;

  const { data: challenge } = await adminSupabase
    .from('challenges')
    .select('id, title, slug')
    .eq('slug', challengeSlug)
    .single();

  if (!challenge) {
    throw new Error('Challenge not found');
  }

  const { data: submissions } = await adminSupabase
    .from('challenge_submissions')
    .select(`
      id,
      photo:photos (id, short_id, url, title),
      user:profiles!challenge_submissions_user_id_fkey (id, email, full_name, nickname)
    `)
    .in('id', submissionIds);

  if (!submissions?.length) {
    throw new Error('No submissions found');
  }

  const { data: emailType } = await adminSupabase
    .from('email_types')
    .select('id')
    .eq('type_key', 'photo_challenges')
    .single();

  const optedOutUserIds = new Set<string>();
  if (emailType) {
    const { data: optedOut } = await adminSupabase
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
  const challengeLinkFull = `${baseUrl}/challenges/${challenge.slug}`;
  const challengeLinkRelative = `/challenges/${challenge.slug}`;

  const submissionsByUser = new Map<
    string,
    {
      user: {
        id: string;
        email: string | null;
        full_name: string | null;
        nickname: string | null;
      };
      photos: Array<{
        id: string;
        short_id: string;
        url: string;
        title: string | null;
      }>;
    }
  >();

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

    const existing = submissionsByUser.get(submissionUser.id);
    if (existing) {
      existing.photos.push(photo);
    } else {
      submissionsByUser.set(submissionUser.id, {
        user: submissionUser,
        photos: [photo],
      });
    }
  }

  const notificationsCreated: string[] = [];
  const emailsSent: string[] = [];

  for (const [userId, { user: submissionUser, photos }] of submissionsByUser) {
    try {
      await createNotification({
        userId: submissionUser.id,
        actorId,
        type: status === 'accepted' ? 'submission_accepted' : 'submission_rejected',
        entityType: 'challenge',
        entityId: challenge.id,
        data: {
          title: challenge.title,
          photoCount: photos.length,
          photoId: photos[0].id,
          photoShortId: photos[0].short_id,
          photoTitle: photos.length === 1 ? photos[0].title : null,
          link: challengeLinkRelative,
          rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        },
      });
      notificationsCreated.push(userId);
    } catch (err) {
      console.error('Failed to create notification:', err);
    }

    if (
      submissionUser.email
      && !isTestEmail(submissionUser.email)
      && !optedOutUserIds.has(submissionUser.id)
    ) {
      try {
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
            photos: photos.map((p) => ({ url: p.url, title: p.title })),
            challengeTitle: challenge.title,
            challengeLink: challengeLinkFull,
            rejectionReason: status === 'rejected' ? rejectionReason : undefined,
            optOutLink,
          }),
        );

        const isSingle = photos.length === 1;
        await resend.emails.send({
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          to: submissionUser.email,
          subject:
            status === 'accepted'
              ? isSingle
                ? `Your photo was accepted for "${challenge.title}"!`
                : `${photos.length} photos accepted for "${challenge.title}"!`
              : isSingle
                ? `Update on your submission to "${challenge.title}"`
                : `Update on your submissions to "${challenge.title}"`,
          html: emailHtml,
        });

        emailsSent.push(submissionUser.email);
      } catch (err) {
        console.error('Failed to send email:', err);
      }
    }
  }

  return {
    notificationsCreated: notificationsCreated.length,
    emailsSent: emailsSent.length,
  };
}
