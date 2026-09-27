import type { Profile } from '@/context/AuthContext';
import { describe, expect, it } from 'vitest';

import {
    isPhotosManageTourDismissed,
    isPhotosUploadTourDismissed,
    parseProfileTours,
    PHOTOS_MANAGE_TOUR_ID,
    PHOTOS_UPLOAD_TOUR_ID,
} from '@/lib/profileTours';

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-123',
    tours: {},
    album_card_style: null,
    motion: null,
    photo_captions: null,
    photo_grid_density: null,
    photo_grid_style: null,
    avatar_url: null,
    banner_blurhash: null,
    banner_url: null,
    bio: null,
    copyright_name: null,
    created_at: null,
    default_license: 'all-rights-reserved',
    deletion_scheduled_at: null,
    email: null,
    embed_copyright_exif: false,
    exif_copyright_text: null,
    full_name: null,
    is_admin: null,
    last_logged_in: null,
    newsletter_opt_in: false,
    nickname: null,
    nickname_changed_at: null,
    onboarding_reminder_sent_at: null,
    search_vector: null,
    social_links: null,
    suspended_at: null,
    suspended_reason: null,
    terms_accepted_at: null,
    theme: null,
    updated_at: null,
    watermark_enabled: false,
    watermark_style: null,
    watermark_text: null,
    website: null,
    ...overrides,
  };
}

describe('parseProfileTours', () => {
  it('reads tour entries from json', () => {
    expect(
      parseProfileTours({
        [PHOTOS_UPLOAD_TOUR_ID]: {
          finished_at: '2026-01-01T00:00:00.000Z',
        },
        [PHOTOS_MANAGE_TOUR_ID]: {
          dismissed_at: '2026-02-01T00:00:00.000Z',
        },
      }),
    ).toEqual({
      photos: { finished_at: '2026-01-01T00:00:00.000Z' },
      'photos-edit': { dismissed_at: '2026-02-01T00:00:00.000Z' },
    });
  });
});

describe('isPhotosUploadTourDismissed', () => {
  it('returns true when finished or dismissed', () => {
    expect(
      isPhotosUploadTourDismissed(
        profile({
          tours: { photos: { finished_at: '2026-01-01T00:00:00.000Z' } },
        }),
      ),
    ).toBe(true);
    expect(
      isPhotosUploadTourDismissed(
        profile({
          tours: { photos: { dismissed_at: '2026-01-01T00:00:00.000Z' } },
        }),
      ),
    ).toBe(true);
  });

  it('returns false when tour has no outcome', () => {
    expect(isPhotosUploadTourDismissed(profile())).toBe(false);
    expect(isPhotosUploadTourDismissed(null)).toBe(false);
  });
});

describe('isPhotosManageTourDismissed', () => {
  it('returns true when photos-edit has an outcome', () => {
    expect(
      isPhotosManageTourDismissed(
        profile({
          tours: { 'photos-edit': { finished_at: '2026-01-01T00:00:00.000Z' } },
        }),
      ),
    ).toBe(true);
  });
});
