import { Resend } from 'resend';
import { render } from '@react-email/render';

import { CommentNotificationEmail, getCommentNotificationSubject } from '@/emails/comment-notification';
import { getEmailSiteUrl, toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
import type { QueuedCommentEmailItem } from '@/lib/notifications/emailQueue';
import { encrypt } from '@/utils/encrypt';
import { createAdminClient } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY!);
const BATCH_LIMIT = 200;

type EmailBatchRow = {
  id: string;
  recipient_user_id: string;
  email_type: string;
  items: unknown;
  notification_ids: string[] | null;
};

export type FlushPendingNotificationEmailsResult = {
  sent: number;
  cancelled: number;
  failed: number;
  processed: number;
};

function parseBatchItems(items: unknown): QueuedCommentEmailItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => {
    const comment = item as QueuedCommentEmailItem;
    return {
      ...comment,
      entityLink: toAbsoluteEmailUrl(comment.entityLink),
      commenterProfileLink: comment.commenterProfileLink
        ? toAbsoluteEmailUrl(comment.commenterProfileLink)
        : null,
    };
  });
}

async function hasOptedOutNotifications(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<boolean> {
  const { data: notificationsEmailType } = await supabase
    .from('email_types')
    .select('id')
    .eq('type_key', 'notifications')
    .single();

  if (!notificationsEmailType) {
    return false;
  }

  const { data: preference } = await supabase
    .from('email_preferences')
    .select('opted_out')
    .eq('user_id', userId)
    .eq('email_type_id', notificationsEmailType.id)
    .single();

  return preference?.opted_out === true;
}

async function allNotificationsSeen(
  supabase: ReturnType<typeof createAdminClient>,
  notificationIds: string[],
): Promise<boolean> {
  if (notificationIds.length === 0) {
    return false;
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, seen_at')
    .in('id', notificationIds);

  if (error || !notifications || notifications.length === 0) {
    return false;
  }

  return notifications.every((notification) => notification.seen_at != null);
}

export async function flushPendingNotificationEmails(): Promise<FlushPendingNotificationEmailsResult> {
  const supabase = createAdminClient();
  const now = new Date();

  const { data: pendingBatches, error: fetchError } = await supabase
    .from('notification_email_batches')
    .select('id, recipient_user_id, email_type, items, notification_ids')
    .eq('status', 'pending')
    .lte('send_after', now.toISOString())
    .order('send_after', { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchError) {
    console.error('Error fetching pending notification email batches:', fetchError);
    throw fetchError;
  }

  if (!pendingBatches || pendingBatches.length === 0) {
    return { sent: 0, cancelled: 0, failed: 0, processed: 0 };
  }

  let sent = 0;
  let cancelled = 0;
  let failed = 0;

  for (const batch of pendingBatches as EmailBatchRow[]) {
    const items = parseBatchItems(batch.items);

    if (items.length === 0) {
      await supabase
        .from('notification_email_batches')
        .update({ status: 'cancelled', updated_at: now.toISOString() })
        .eq('id', batch.id)
        .eq('status', 'pending');
      cancelled += 1;
      continue;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, suspended_at')
      .eq('id', batch.recipient_user_id)
      .single();

    if (!profile?.email || profile.suspended_at) {
      await supabase
        .from('notification_email_batches')
        .update({ status: 'cancelled', updated_at: now.toISOString() })
        .eq('id', batch.id)
        .eq('status', 'pending');
      cancelled += 1;
      continue;
    }

    if (await hasOptedOutNotifications(supabase, batch.recipient_user_id)) {
      await supabase
        .from('notification_email_batches')
        .update({ status: 'cancelled', updated_at: now.toISOString() })
        .eq('id', batch.id)
        .eq('status', 'pending');
      cancelled += 1;
      continue;
    }

    const notificationIds = batch.notification_ids ?? [];
    if (notificationIds.length > 0 && await allNotificationsSeen(supabase, notificationIds)) {
      await supabase
        .from('notification_email_batches')
        .update({ status: 'cancelled', updated_at: now.toISOString() })
        .eq('id', batch.id)
        .eq('status', 'pending');
      cancelled += 1;
      continue;
    }

    let optOutLink: string | undefined;
    try {
      const encrypted = encrypt(JSON.stringify({
        userId: batch.recipient_user_id,
        emailType: 'notifications',
      }));
      optOutLink = `${getEmailSiteUrl()}/unsubscribe/${encodeURIComponent(encrypted)}`;
    } catch (error) {
      console.error(`Error generating opt-out link for batch ${batch.id}:`, error);
    }

    const ownerName = profile.full_name || profile.email.split('@')[0] || 'Friend';

    try {
      const emailResult = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: profile.email,
        replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
        subject: getCommentNotificationSubject(items),
        headers: optOutLink
          ? {
            'List-Unsubscribe': `<${optOutLink}>`,
          }
          : undefined,
        html: await render(
          CommentNotificationEmail({
            ownerName,
            items,
            optOutLink,
          }),
        ),
      });

      if (emailResult.error) {
        console.error(`Error sending notification email batch ${batch.id}:`, emailResult.error);
        failed += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from('notification_email_batches')
        .update({
          status: 'sent',
          sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', batch.id)
        .eq('status', 'pending');

      if (updateError) {
        console.error(`Error marking batch ${batch.id} as sent:`, updateError);
        failed += 1;
        continue;
      }

      sent += 1;
    } catch (error) {
      console.error(`Exception sending notification email batch ${batch.id}:`, error);
      failed += 1;
    }
  }

  return {
    sent,
    cancelled,
    failed,
    processed: pendingBatches.length,
  };
}
