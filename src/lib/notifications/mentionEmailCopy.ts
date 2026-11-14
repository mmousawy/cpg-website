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
      return title && title !== 'Untitled photo'
        ? `${name} tagged you in “${title}”`
        : `${name} tagged you in a photo`;
    }
    return `${name} mentioned you in ${first.contextLabel}${title ? ` on ${title}` : ''}`;
  }

  if (items.every((item) => item.kind === 'photo_tag')) {
    return `${items.length} new photo tags`;
  }

  return `${items.length} new mentions`;
}

export function getMentionNotificationHeading(items: MentionEmailItem[]): string {
  if (items.length === 0) return 'You were mentioned';
  if (items.every((item) => item.kind === 'photo_tag')) {
    return items.length === 1 ? 'You were tagged in a photo' : 'You were tagged in photos';
  }
  if (items.length !== 1) return 'New mentions';
  return 'You were mentioned';
}

export function getMentionNotificationIntro(items: MentionEmailItem[]): string {
  if (items.length === 0) return 'You were mentioned:';
  const first = items[0];
  const name = actorLabel(first);

  if (items.length === 1) {
    if (first.kind === 'photo_tag') {
      return `${name} tagged you in a photo:`;
    }
    return `${name} mentioned you in ${first.contextLabel}:`;
  }

  if (items.every((item) => item.kind === 'photo_tag')) {
    return 'You were tagged in these photos:';
  }

  return 'Here are the latest mentions:';
}
