import { describe, expect, it } from 'vitest';

import { buildProfilePageJsonLd } from './jsonLd';

describe('buildProfilePageJsonLd', () => {
  it('splits display name and nickname and includes published website in sameAs', () => {
    const jsonLd = buildProfilePageJsonLd({
      nickname: 'ada',
      fullName: 'Ada Lovelace',
      createdAt: '2024-01-01T00:00:00.000Z',
      website: 'https://ada.example',
      socialLinks: [{ label: 'instagram', url: 'https://instagram.com/ada' }],
      bio: 'Photographer in Rotterdam',
      interests: [{ id: '1', name: 'Street', count: 3, created_at: '2024-01-01' }],
      followerCount: 12,
      followingCount: 4,
      publicPhotoCount: 20,
      likesGiven: 8,
    });

    expect(jsonLd.dateCreated).toBe('2024-01-01T00:00:00.000Z');
    expect(jsonLd.mainEntity).toMatchObject({
      '@type': 'Person',
      '@id': expect.stringContaining('/@ada#person'),
      name: 'Ada Lovelace',
      alternateName: '@ada',
      identifier: 'ada',
      description: 'Photographer in Rotterdam',
      knowsAbout: ['Street'],
    });
    expect(jsonLd.mainEntity.sameAs).toEqual([
      'https://instagram.com/ada',
      'https://ada.example',
    ]);
    expect(jsonLd.mainEntity.interactionStatistic).toMatchObject({
      interactionType: 'https://schema.org/FollowAction',
      userInteractionCount: 12,
    });
  });
});
