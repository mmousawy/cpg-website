import { describe, expect, it } from 'vitest';

import type { MentionEmailItem } from '@/lib/notifications/emailQueue';
import {
  getMentionNotificationHeading,
  getMentionNotificationIntro,
  getMentionNotificationSubject,
} from '@/lib/notifications/mentionEmailCopy';

const tagItem: MentionEmailItem = {
  kind: 'photo_tag',
  actorName: 'Murtada',
  actorNickname: 'murtada',
  actorAvatarUrl: null,
  actorProfileLink: '/@murtada',
  entityTitle: 'Street scene',
  entityThumbnail: 'https://example.com/photo.jpg',
  entityLink: '/@murtada/photo/abc',
  contextLabel: 'a photo',
};

const mentionItem: MentionEmailItem = {
  kind: 'mention',
  actorName: 'Jane Smith',
  actorNickname: 'janesmith',
  actorAvatarUrl: null,
  actorProfileLink: '/@janesmith',
  entityTitle: 'Street Photography',
  entityThumbnail: null,
  entityLink: '/@owner/album/street',
  contextLabel: 'a comment',
};

describe('getMentionNotificationSubject', () => {
  it('includes the photo title for a single tag', () => {
    expect(getMentionNotificationSubject([tagItem])).toBe('Murtada tagged you in “Street scene”');
  });

  it('falls back when the photo is untitled', () => {
    expect(getMentionNotificationSubject([{
      ...tagItem,
      entityTitle: 'Untitled photo',
    }])).toBe('Murtada tagged you in a photo');
  });

  it('describes a text mention', () => {
    expect(getMentionNotificationSubject([mentionItem])).toBe(
      'Jane Smith mentioned you in a comment on Street Photography',
    );
  });

  it('uses a bundled subject for several photo tags', () => {
    expect(getMentionNotificationSubject([
      tagItem,
      { ...tagItem, entityLink: '/@murtada/photo/def' },
    ])).toBe('2 new photo tags');
  });
});

describe('getMentionNotificationHeading', () => {
  it('uses tag and mention headings', () => {
    expect(getMentionNotificationHeading([tagItem])).toBe('You were tagged in a photo');
    expect(getMentionNotificationHeading([mentionItem])).toBe('You were mentioned');
    expect(getMentionNotificationHeading([tagItem, tagItem])).toBe('You were tagged in photos');
  });
});

describe('getMentionNotificationIntro', () => {
  it('names the actor for a single tag', () => {
    expect(getMentionNotificationIntro([tagItem])).toBe('Murtada tagged you in a photo:');
  });
});
