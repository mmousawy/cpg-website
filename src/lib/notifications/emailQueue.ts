import type { Json } from '@/database.types';
import { toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
import { userIdsIncludeTestUser } from '@/lib/auth/isTestEmail';
import type { EmailTemplateKey } from '@/lib/email/templateKeys';
import { EMAIL_TEMPLATE_KEYS } from '@/lib/email/templateKeys';
import { scheduleNotificationEmailFlush } from '@/lib/notifications/scheduleNotificationEmailFlush';
import { createAdminClient } from '@/utils/supabase/admin';

export type CommentEmailEntityType = 'album' | 'photo' | 'event' | 'challenge';

export type QueuedCommentEmailItem = {
  commentId: string;
  commenterName: string;
  commenterNickname: string | null;
  commenterAvatarUrl: string | null;
  commenterProfileLink: string | null;
  commentText: string;
  entityType: CommentEmailEntityType;
  entityTitle: string;
  entityThumbnail: string | null;
  entityLink: string;
  isReply: boolean;
};

const DEFAULT_DEBOUNCE_MINUTES = 15;

export async function enqueueDebouncedNotificationEmail(params: {
  recipientUserId: string;
  batchKey: string;
  templateKey: EmailTemplateKey;
  item: Json;
  emailType?: string;
  notificationId?: string;
  debounceMinutes?: number;
}): Promise<void> {
  if (await userIdsIncludeTestUser(params.recipientUserId)) {
    return;
  }

  const supabase = createAdminClient();

  try {
    const { error } = await supabase.rpc('enqueue_notification_email_batch', {
      p_recipient_user_id: params.recipientUserId,
      p_batch_key: params.batchKey,
      p_item: params.item,
      p_email_type: params.emailType ?? 'notifications',
      p_notification_id: params.notificationId,
      p_debounce_minutes: params.debounceMinutes ?? DEFAULT_DEBOUNCE_MINUTES,
      p_template_key: params.templateKey,
    });

    if (error) {
      console.error('Error enqueueing debounced notification email:', error);
    } else {
      scheduleNotificationEmailFlush();
    }
  } catch (err) {
    console.error('Exception enqueueing debounced notification email:', err);
  }
}

export function buildNotificationEmailBatchKey(
  entityType: string,
  entityId: string,
): string {
  return `${entityType}:${entityId}`;
}

export async function enqueueCommentNotificationEmail(params: {
  recipientUserId: string;
  entityId: string;
  notificationId?: string;
  item: QueuedCommentEmailItem;
  batchEntityType?: string;
  debounceMinutes?: number;
}): Promise<void> {
  if (await userIdsIncludeTestUser(params.recipientUserId)) {
    return;
  }

  const batchEntityType = params.batchEntityType ?? params.item.entityType;
  const batchKey = buildNotificationEmailBatchKey(batchEntityType, params.entityId);

  await enqueueDebouncedNotificationEmail({
    recipientUserId: params.recipientUserId,
    batchKey,
    templateKey: EMAIL_TEMPLATE_KEYS.commentNotification,
    item: params.item as unknown as Json,
    emailType: 'notifications',
    notificationId: params.notificationId,
    debounceMinutes: params.debounceMinutes,
  });
}

export async function queueCommentNotificationEmail(params: {
  recipientUserId: string;
  entityId: string;
  notificationId?: string;
  commentId: string;
  commenterName: string;
  commenterNickname: string | null;
  commenterAvatarUrl: string | null;
  commenterProfileLink: string | null;
  commentText: string;
  entityType: CommentEmailEntityType;
  entityTitle: string;
  entityThumbnail: string | null;
  entityLink: string;
  isReply: boolean;
  batchEntityType?: string;
  debounceMinutes?: number;
}): Promise<void> {
  const item: QueuedCommentEmailItem = {
    commentId: params.commentId,
    commenterName: params.commenterName,
    commenterNickname: params.commenterNickname,
    commenterAvatarUrl: params.commenterAvatarUrl,
    commenterProfileLink: params.commenterProfileLink
      ? toAbsoluteEmailUrl(params.commenterProfileLink)
      : null,
    commentText: params.commentText.trim(),
    entityType: params.entityType,
    entityTitle: params.entityTitle,
    entityThumbnail: params.entityThumbnail,
    entityLink: toAbsoluteEmailUrl(params.entityLink),
    isReply: params.isReply,
  };

  await enqueueCommentNotificationEmail({
    recipientUserId: params.recipientUserId,
    entityId: params.entityId,
    notificationId: params.notificationId,
    item,
    batchEntityType: params.batchEntityType,
    debounceMinutes: params.debounceMinutes,
  });
}
