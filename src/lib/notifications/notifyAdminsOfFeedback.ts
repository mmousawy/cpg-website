import { Resend } from 'resend';
import { render } from '@react-email/render';

import { FeedbackNotificationEmail } from '@/emails/feedback-notification';
import { isTestEmail, userIdsIncludeTestUser } from '@/lib/auth/isTestEmail';
import { createNotification } from '@/lib/notifications/create';
import { FEEDBACK_SUBJECTS } from '@/types/feedback';
import { adminSupabase } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY!);

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

  const { data: admins, error: adminsError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_admin', true)
    .is('deletion_scheduled_at', null);

  if (adminsError || !admins?.length) {
    if (adminsError) console.error('Error fetching admins:', adminsError);
    return;
  }

  await Promise.all(
    admins.map((admin) =>
      createNotification({
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
      }),
    ),
  );

  const adminsToEmail = admins.filter((admin) => Boolean(admin.email));

  if (adminsToEmail.length === 0) {
    return;
  }

  try {
    const emails = await Promise.all(
      adminsToEmail.map(async (admin) => {
        const html = await render(
          FeedbackNotificationEmail({
            adminName: admin.full_name || 'Admin',
            submitterName,
            submitterEmail: feedback.email,
            subject: feedback.subject,
            message: feedback.message,
            screenshots: feedback.screenshots ?? null,
            reviewLink: reviewLinkFull,
          }),
        );

        return {
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          to: admin.email!,
          subject: `New Feedback: ${submitterName} - ${subjectLabel}`,
          html,
        };
      }),
    );

    if (emails.length > 0) {
      await resend.batch.send(emails);
    }
  } catch (emailError) {
    console.error('Error sending feedback notification emails:', emailError);
  }
}
