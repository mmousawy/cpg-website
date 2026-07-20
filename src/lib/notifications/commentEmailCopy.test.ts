import { describe, expect, it } from 'vitest';

import {
  getCommentNotificationHeading,
  getCommentNotificationPreview,
  getCommentNotificationSubject,
} from '@/lib/notifications/commentEmailCopy';
import { buildNotificationEmailBatchKey } from '@/lib/notifications/emailQueue';
import type { QueuedCommentEmailItem } from '@/lib/notifications/emailQueue';

const baseItem: QueuedCommentEmailItem = {
  commentId: 'comment-1',
  commenterName: 'Jane Smith',
  commenterNickname: 'janesmith',
  commenterAvatarUrl: null,
  commenterProfileLink: '/@janesmith',
  commentText: 'Nice shot!',
  entityType: 'album',
  entityTitle: 'Street Photography',
  entityThumbnail: null,
  entityLink: '/@owner/album/street',
  isReply: false,
};

describe('buildNotificationEmailBatchKey', () => {
  it('combines entity type and id', () => {
    expect(buildNotificationEmailBatchKey('album', 'abc-123')).toBe('album:abc-123');
    expect(buildNotificationEmailBatchKey('scene_event', 'scene-1')).toBe('scene_event:scene-1');
  });
});

describe('getCommentNotificationSubject', () => {
  it('uses single-comment subjects', () => {
    expect(getCommentNotificationSubject([baseItem])).toBe('Jane Smith commented on your album');

    expect(getCommentNotificationSubject([{
      ...baseItem,
      entityType: 'photo',
      isReply: true,
    }])).toBe('Jane Smith replied to your comment on Street Photography');

    expect(getCommentNotificationSubject([{
      ...baseItem,
      entityType: 'event',
    }])).toBe('Jane Smith commented on the event "Street Photography"');
  });

  it('uses bundled subject for multiple comments', () => {
    expect(getCommentNotificationSubject([
      baseItem,
      { ...baseItem, commentId: 'comment-2', commenterName: 'John Doe' },
    ])).toBe('2 new comments on Street Photography');
  });
});

describe('getCommentNotificationHeading', () => {
  it('uses single and bundled headings', () => {
    expect(getCommentNotificationHeading([baseItem])).toBe('New comment on your album');
    expect(getCommentNotificationHeading([
      baseItem,
      { ...baseItem, commentId: 'comment-2' },
    ])).toBe('2 new comments on Street Photography');
  });
});

describe('getCommentNotificationPreview', () => {
  it('matches subject for bundled comments', () => {
    const items = [baseItem, { ...baseItem, commentId: 'comment-2' }];
    expect(getCommentNotificationPreview(items)).toBe(getCommentNotificationSubject(items));
  });
});
