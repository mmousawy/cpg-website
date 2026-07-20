import type { Json } from '@/database.types';
import { toAbsoluteEmailUrl } from '@/emails/utils/siteUrl';
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
  const supabase = createAdminClient();
  const batchEntityType = params.batchEntityType ?? params.item.entityType;
  const batchKey = buildNotificationEmailBatchKey(batchEntityType, params.entityId);

  try {
    const { error } = await supabase.rpc('enqueue_notification_email_batch', {
      p_recipient_user_id: params.recipientUserId,
      p_batch_key: batchKey,
      p_item: params.item as unknown as Json,
      p_email_type: 'notifications',
      p_notification_id: params.notificationId,
      p_debounce_minutes: params.debounceMinutes ?? DEFAULT_DEBOUNCE_MINUTES,
    });

    if (error) {
      console.error('Error enqueueing comment notification email:', error);
    } else {
      scheduleNotificationEmailFlush();
    }
  } catch (err) {
    console.error('Exception enqueueing comment notification email:', err);
  }
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
