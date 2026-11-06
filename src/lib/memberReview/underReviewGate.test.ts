import { describe, expect, it } from 'vitest';

import {
  isOwnPublicProfilePath,
  isUnderReviewRestrictedPath,
  isUnderReviewWriteBlocked,
} from '@/lib/memberReview/underReviewGate';

describe('isOwnPublicProfilePath', () => {
  it('matches the nickname profile and nested routes', () => {
    expect(isOwnPublicProfilePath('/@murtada', 'murtada')).toBe(true);
    expect(isOwnPublicProfilePath('/@murtada/photos', 'murtada')).toBe(true);
    expect(isOwnPublicProfilePath('/@murtada/album/foo', 'murtada')).toBe(true);
  });

  it('does not match other nicknames or missing nicknames', () => {
    expect(isOwnPublicProfilePath('/@karsten', 'murtada')).toBe(false);
    expect(isOwnPublicProfilePath('/@murtada', null)).toBe(false);
    expect(isOwnPublicProfilePath('/gallery', 'murtada')).toBe(false);
  });
});

describe('isUnderReviewRestrictedPath', () => {
  it('locks account pages and account APIs', () => {
    expect(isUnderReviewRestrictedPath('/account')).toBe(true);
    expect(isUnderReviewRestrictedPath('/account/events')).toBe(true);
    expect(isUnderReviewRestrictedPath('/api/account/profile')).toBe(true);
  });

  it('does not lock account-deleted or the rest of the site', () => {
    expect(isUnderReviewRestrictedPath('/account-deleted')).toBe(false);
    expect(isUnderReviewRestrictedPath('/gallery')).toBe(false);
    expect(isUnderReviewRestrictedPath('/api/likes')).toBe(false);
    expect(isUnderReviewRestrictedPath('/@karsten', 'murtada')).toBe(false);
  });

  it('locks the member public profile when nickname is known', () => {
    expect(isUnderReviewRestrictedPath('/@murtada/gear', 'murtada')).toBe(true);
  });
});

describe('isUnderReviewWriteBlocked', () => {
  it('blocks likes, comments, follows, and other writes', () => {
    expect(isUnderReviewWriteBlocked('/api/likes', 'POST')).toBe(true);
    expect(isUnderReviewWriteBlocked('/api/comments', 'POST')).toBe(true);
    expect(isUnderReviewWriteBlocked('/api/follows', 'DELETE')).toBe(true);
    expect(isUnderReviewWriteBlocked('/api/confirm', 'POST')).toBe(true);
  });

  it('allows reads and a few account-adjacent writes', () => {
    expect(isUnderReviewWriteBlocked('/api/likes', 'GET')).toBe(false);
    expect(isUnderReviewWriteBlocked('/api/notifications', 'POST')).toBe(false);
    expect(isUnderReviewWriteBlocked('/api/contact', 'POST')).toBe(false);
    expect(isUnderReviewWriteBlocked('/api/views', 'POST')).toBe(false);
  });
});
