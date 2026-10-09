import { isTestEmail, userIdsIncludeTestUser } from '@/lib/auth/isTestEmail';
import { EMAIL_TEMPLATE_KEYS } from '@/lib/email/templateKeys';
import { createNotification } from '@/lib/notifications/create';
import { enqueueDebouncedNotificationEmail } from '@/lib/notifications/emailQueue';
import { FEEDBACK_SUBJECTS } from '@/types/feedback';
import { adminSupabase } from '@/utils/supabase/admin';

export async function notifyAdminsOfFeedback(feedbackId: string): Promise<void> {
  const { data: feedback, error: feedbackError } = await adminSupabase
    .from('feedback')
    .select('*')
    .eq('id', feedbackId)
    .single();

  if (feedbackError || !feedback) {
    console.error('Error fetching feedback for notify:', feedbackError);
    return;
  }

  if (isTestEmail(feedback.email) || await userIdsIncludeTestUser(feedback.user_id)) {
    return;
  }

  let submitterName = feedback.name;
  let submitterAvatarUrl: string | null = null;

  if (feedback.user_id) {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, nickname, avatar_url')
      .eq('id', feedback.user_id)
      .single();

    if (profile) {
      submitterName = profile.full_name || profile.nickname || 'User';
      submitterAvatarUrl = profile.avatar_url;
    }
  }

  const subjectLabel = FEEDBACK_SUBJECTS.find((s) => s.value === feedback.subject)?.label ?? feedback.subject;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const reviewLinkRelative = '/admin/feedback';
  const reviewLinkFull = `${baseUrl}/admin/feedback`;

  const queueItem = {
    submitterName,
    submitterEmail: feedback.email,
    subject: feedback.subject,
    subjectLabel,
    message: feedback.message,
    screenshots: feedback.screenshots ?? null,
    reviewLink: reviewLinkFull,
  };

  const { data: admins, error: adminsError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_admin', true)
    .is('deletion_scheduled_at', null);

  if (adminsError || !admins?.length) {
    if (adminsError) console.error('Error fetching admins:', adminsError);
    return;
  }

  for (const admin of admins) {
    const { notificationId } = await createNotification({
      userId: admin.id,
      actorId: feedback.user_id || null,
      type: 'feedback_submitted',
      entityType: 'feedback',
      entityId: feedback.id,
      data: {
        title: subjectLabel,
        thumbnail: submitterAvatarUrl,
        link: reviewLinkRelative,
        actorName: submitterName,
      },
    });

    if (!admin.email || isTestEmail(admin.email)) {
      continue;
    }

    await enqueueDebouncedNotificationEmail({
      recipientUserId: admin.id,
      batchKey: 'admin_feedback',
      templateKey: EMAIL_TEMPLATE_KEYS.feedbackNotification,
      notificationId,
      item: queueItem,
    });
  }
}
