import { isTestEmail } from '@/lib/auth/isTestEmail';
import { EMAIL_TEMPLATE_KEYS } from '@/lib/email/templateKeys';
import { createNotification } from '@/lib/notifications/create';
import { enqueueDebouncedNotificationEmail } from '@/lib/notifications/emailQueue';
import { adminSupabase } from '@/utils/supabase/admin';

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
  const batchKey = `submission_${status}:${challenge.id}`;

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
  const emailsQueued: string[] = [];

  for (const [userId, { user: submissionUser, photos }] of submissionsByUser) {
    try {
      const { notificationId } = await createNotification({
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

      if (
        submissionUser.email
        && !isTestEmail(submissionUser.email)
        && !optedOutUserIds.has(submissionUser.id)
      ) {
        await enqueueDebouncedNotificationEmail({
          recipientUserId: submissionUser.id,
          batchKey,
          templateKey: EMAIL_TEMPLATE_KEYS.submissionResult,
          emailType: 'photo_challenges',
          notificationId,
          item: {
            status,
            photos: photos.map((p) => ({ url: p.url, title: p.title })),
            challengeTitle: challenge.title,
            challengeLink: challengeLinkFull,
            rejectionReason: status === 'rejected' ? rejectionReason : undefined,
          },
        });
        emailsQueued.push(submissionUser.email);
      }
    } catch (err) {
      console.error('Failed to create notification or queue email:', err);
    }
  }

  return {
    notificationsCreated: notificationsCreated.length,
    emailsSent: emailsQueued.length,
  };
}
