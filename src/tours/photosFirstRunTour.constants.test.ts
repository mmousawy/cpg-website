import { describe, expect, it } from 'vitest';

import {
    isPhotosManageTourMockMode,
    isPhotosTourMockMode,
    PHOTOS_MANAGE_TOUR_QUERY_VALUE,
    PHOTOS_TOUR_QUERY_PARAM,
    PHOTOS_TOUR_QUERY_VALUE,
} from '@/tours/photosFirstRunTour.constants';

describe('isPhotosTourMockMode', () => {
  it('returns true when tour query matches photos', () => {
    const params = new URLSearchParams({ [PHOTOS_TOUR_QUERY_PARAM]: PHOTOS_TOUR_QUERY_VALUE });
    expect(isPhotosTourMockMode(params)).toBe(true);
  });

  it('returns false for other values or missing param', () => {
    expect(isPhotosTourMockMode(new URLSearchParams({ tour: 'albums' }))).toBe(false);
    expect(isPhotosTourMockMode(new URLSearchParams())).toBe(false);
    expect(isPhotosTourMockMode(null)).toBe(false);
  });
});

describe('isPhotosManageTourMockMode', () => {
  it('returns true when tour query matches photos-edit', () => {
    const params = new URLSearchParams({
      [PHOTOS_TOUR_QUERY_PARAM]: PHOTOS_MANAGE_TOUR_QUERY_VALUE,
    });
    expect(isPhotosManageTourMockMode(params)).toBe(true);
  });

  it('returns false for upload mock or missing param', () => {
    expect(
      isPhotosManageTourMockMode(
        new URLSearchParams({ [PHOTOS_TOUR_QUERY_PARAM]: PHOTOS_TOUR_QUERY_VALUE }),
      ),
    ).toBe(false);
    expect(isPhotosManageTourMockMode(new URLSearchParams())).toBe(false);
  });
});
