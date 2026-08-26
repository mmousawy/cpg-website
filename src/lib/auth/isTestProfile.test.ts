import { describe, expect, it } from 'vitest';

import {
  filterSearchResults,
  filterStreamPhotos,
  isPublicProfileAllowed,
  isTestProfile,
} from './isTestProfile';

describe('isTestProfile', () => {
  it('matches e2e nicknames and test emails', () => {
    expect(isTestProfile({ nickname: 'test-1234567890' })).toBe(true);
    expect(isTestProfile({ email: 'test-e2e-1@test.local' })).toBe(true);
    expect(isTestProfile({ nickname: 'karsten' })).toBe(false);
  });
});

describe('isPublicProfileAllowed', () => {
  it('blocks test profiles unless includeTestContent is true', () => {
    expect(isPublicProfileAllowed('test-123', false)).toBe(false);
    expect(isPublicProfileAllowed('test-123', true)).toBe(true);
    expect(isPublicProfileAllowed('karsten', false)).toBe(true);
  });
});

describe('filterStreamPhotos', () => {
  it('removes photos from test profiles by default', () => {
    const photos = [
      { id: '1', profile: { nickname: 'test-1' } },
      { id: '2', profile: { nickname: 'karsten' } },
    ];
    expect(filterStreamPhotos(photos, false)).toHaveLength(1);
    expect(filterStreamPhotos(photos, true)).toHaveLength(2);
  });
});

describe('filterSearchResults', () => {
  it('removes member/photo/album hits for test nicknames', () => {
    const results = [
      {
        entity_type: 'members' as const,
        entity_id: '1',
        title: 'Test User',
        subtitle: '@test-123',
        image_url: null,
        image_blurhash: null,
        url: '/@test-123',
        rank: 1,
      },
      {
        entity_type: 'events' as const,
        entity_id: '2',
        title: 'Meetup',
        subtitle: 'Amsterdam',
        image_url: null,
        image_blurhash: null,
        url: '/events/foo',
        rank: 0.9,
      },
    ];
    expect(filterSearchResults(results, false)).toHaveLength(1);
    expect(filterSearchResults(results, true)).toHaveLength(2);
  });
});
