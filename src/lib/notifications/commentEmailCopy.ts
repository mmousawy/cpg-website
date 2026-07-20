import type { QueuedCommentEmailItem } from '@/lib/notifications/emailQueue';

export function getCommentNotificationSubject(items: QueuedCommentEmailItem[]): string {
  if (items.length === 0) {
    return 'New comment notification';
  }

  const first = items[0];
  const entityTitle = first.entityTitle;

  if (items.length === 1) {
    if (first.isReply) {
      return `${first.commenterName} replied to your comment on ${entityTitle}`;
    }

    if (first.entityType === 'album' || first.entityType === 'photo') {
      return `${first.commenterName} commented on your ${first.entityType}`;
    }

    return `${first.commenterName} commented on the ${first.entityType} "${entityTitle}"`;
  }

  return `${items.length} new comments on ${entityTitle}`;
}

export function getCommentNotificationHeading(items: QueuedCommentEmailItem[]): string {
  if (items.length === 0) {
    return 'New comment';
  }

  const first = items[0];

  if (items.length === 1) {
    if (first.isReply) {
      return 'New reply to your comment';
    }

    if (first.entityType === 'album' || first.entityType === 'photo') {
      return `New comment on your ${first.entityType}`;
    }

    return `New comment on ${first.entityTitle}`;
  }

  return `${items.length} new comments on ${first.entityTitle}`;
}

export function getCommentNotificationPreview(items: QueuedCommentEmailItem[]): string {
  if (items.length === 0) {
    return 'New comment notification';
  }

  if (items.length === 1) {
    const first = items[0];
    return first.isReply
      ? `${first.commenterName} replied to your comment on ${first.entityTitle}`
      : `${first.commenterName} commented on your ${first.entityType}`;
  }

  return getCommentNotificationSubject(items);
}

export function truncateCommentText(text: string, maxLength = 200): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength)}...`;
}
