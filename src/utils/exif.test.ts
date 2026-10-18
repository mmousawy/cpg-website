import { describe, expect, it } from 'vitest';

import { getFormattedExif } from '@/utils/exif';

describe('getFormattedExif', () => {
  it('formats capture time in Europe/Amsterdam', () => {
    const formatted = getFormattedExif({
      DateTimeOriginal: '2016-03-27T13:31:24.000Z',
    });

    expect(formatted?.dateTaken).toBe('March 27, 2016 at 3:31 PM');
  });

  it('reads decimal GPS and ignores empty degree arrays', () => {
    const formatted = getFormattedExif({
      latitude: 31.804747221666666,
      longitude: 35.05195833333333,
      GPSLatitude: [null, null, null],
      GPSLongitude: [null, null, null],
    });

    expect(formatted?.location).toEqual({
      lat: 31.804747221666666,
      lng: 35.05195833333333,
    });
    expect(formatted?.locationLabel).toBe('31.80475° N, 35.05196° E');
  });

  it('converts degree-minute-second GPS and applies hemisphere', () => {
    const formatted = getFormattedExif({
      GPSLatitude: [51, 55, 21],
      GPSLatitudeRef: 'N',
      GPSLongitude: [4, 28, 45],
      GPSLongitudeRef: 'W',
    });

    expect(formatted?.location?.lat).toBeCloseTo(51.9225, 4);
    expect(formatted?.location?.lng).toBeCloseTo(-4.479166, 4);
  });

  it('skips GPS when only empty coordinate arrays are present', () => {
    const formatted = getFormattedExif({
      Make: 'Canon',
      GPSLatitude: [null, null, null],
      GPSLongitude: [null, null, null],
    });

    expect(formatted?.camera).toBe('Canon');
    expect(formatted?.location).toBeUndefined();
  });
});
