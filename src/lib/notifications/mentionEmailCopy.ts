import type { MentionEmailItem } from '@/lib/notifications/emailQueue';

function actorLabel(item: MentionEmailItem): string {
  return item.actorName || 'Someone';
}

export function getMentionNotificationSubject(items: MentionEmailItem[]): string {
  if (items.length === 0) return 'New mention';
  const first = items[0];
  const name = actorLabel(first);
  const title = first.entityTitle || 'a post';

  if (items.length === 1) {
    if (first.kind === 'photo_tag') {
      return `${name} tagged you in a photo`;
    }
    return `${name} mentioned you in ${first.contextLabel}${title ? ` on ${title}` : ''}`;
  }

  return `${items.length} new mentions`;
}

export function getMentionNotificationHeading(items: MentionEmailItem[]): string {
  if (items.length !== 1) return 'New mentions';
  return items[0].kind === 'photo_tag' ? 'You were tagged in a photo' : 'You were mentioned';
}
