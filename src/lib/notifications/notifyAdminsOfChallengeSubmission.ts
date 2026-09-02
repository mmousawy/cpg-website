import { render } from '@react-email/render';

import { SubmissionNotificationEmail } from '@/emails/submission-notification';
import { isTestEmail } from '@/lib/auth/isTestEmail';
import { notifyAdmins } from '@/lib/notifications/notifyAdmins';
import { adminSupabase } from '@/utils/supabase/admin';

export async function notifyAdminsOfChallengeSubmission(params: {
  submitterId: string;
  challengeId: string;
  photoIds: string[];
}): Promise<void> {
  const { submitterId, challengeId, photoIds } = params;

  if (photoIds.length === 0) {
    return;
  }

  const { data: submitterProfile, error: submitterError } = await adminSupabase
    .from('profiles')
    .select('full_name, nickname, email, avatar_url')
    .eq('id', submitterId)
    .single();

  if (submitterError || !submitterProfile) {
    console.error('Error fetching submitter for challenge notify:', submitterError);
    return;
  }

  if (isTestEmail(submitterProfile.email)) {
    return;
  }

  const { data: challenge, error: challengeError } = await adminSupabase
    .from('challenges')
    .select('id, title, slug, cover_image_url')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) {
    console.error('Error fetching challenge for submission notify:', challengeError);
    return;
  }

  const { data: submissions } = await adminSupabase
    .from('challenge_submissions')
    .select('photo_id')
    .eq('challenge_id', challengeId)
    .eq('user_id', submitterId)
    .in('photo_id', photoIds);

  const submittedPhotoIds = (submissions || []).map((submission) => submission.photo_id);
  if (submittedPhotoIds.length === 0) {
    console.error('No matching challenge submissions found for notify');
    return;
  }

  const { data: photos } = await adminSupabase
    .from('photos')
    .select('id, url')
    .in('id', submittedPhotoIds)
    .limit(6);

  const photoUrls = (photos || []).map((photo) => photo.url);
  const photoCount = submittedPhotoIds.length;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const submitterName = submitterProfile.full_name
    || submitterProfile.nickname
    || submitterProfile.email?.split('@')[0]
    || 'Someone';
  const submitterNickname = submitterProfile.nickname || null;
  const submitterAvatarUrl = submitterProfile.avatar_url || null;
  const submitterProfileLink = submitterNickname
    ? `${baseUrl}/@${submitterNickname}`
    : null;
  const challengeLink = `${baseUrl}/challenges/${challenge.slug}`;
  const reviewLinkFull = `${baseUrl}/admin/challenges/${challenge.slug}/submissions`;
  const reviewLinkRelative = `/admin/challenges/${challenge.slug}/submissions`;

  await notifyAdmins({
    notification: {
      actorId: submitterId,
      type: 'new_submission',
      entityType: 'challenge',
      entityId: challenge.id,
      data: {
        title: challenge.title,
        thumbnail: challenge.cover_image_url,
        link: reviewLinkRelative,
        actorName: submitterName,
        actorNickname: submitterNickname,
        actorAvatar: submitterAvatarUrl,
        photoCount,
      },
    },
    buildEmail: async (admin) => {
      const html = await render(
        SubmissionNotificationEmail({
          adminName: admin.full_name || 'Admin',
          submitterName,
          submitterNickname,
          submitterAvatarUrl,
          submitterProfileLink,
          photoCount,
          photoUrls,
          challengeTitle: challenge.title,
          challengeThumbnail: challenge.cover_image_url,
          challengeLink,
          reviewLink: reviewLinkFull,
        }),
      );

      return {
        subject: `New submission: ${submitterName} submitted to "${challenge.title}"`,
        html,
      };
    },
  });
}
