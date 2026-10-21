import { describe, expect, it } from 'vitest';

import {
  exifGearFieldsChanged,
  exifToFormValues,
  formatDateForDatetimeLocal,
  getCommonExifFormValues,
  getFormattedExif,
  mergeExifEdits,
  mergeExifEditsPartial,
  parseDatetimeLocalInTimeZone,
  parseExposureTimeInput,
  wallClockInTimeZoneToUtc,
} from '@/utils/exif';

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

describe('parseExposureTimeInput', () => {
  it('parses fractional and second shutter speeds', () => {
    expect(parseExposureTimeInput('1/250')).toBeCloseTo(0.004, 5);
    expect(parseExposureTimeInput('2s')).toBe(2);
  });
});

describe('mergeExifEdits', () => {
  it('preserves unknown keys and clears GPS degree fields when setting decimal coords', () => {
    const merged = mergeExifEdits(
      { CustomTag: 'keep', GPSLatitude: [51, 55, 21], Make: 'Old' },
      {
        make: 'Canon',
        model: 'EOS R5',
        lensModel: '',
        iso: '400',
        aperture: '2.8',
        exposureTime: '1/250',
        focalLength: '50',
        captureTime: '',
        latitude: '52.1',
        longitude: '4.3',
      },
    );

    expect(merged?.CustomTag).toBe('keep');
    expect(merged?.Make).toBe('Canon');
    expect(merged?.Model).toBe('EOS R5');
    expect(merged?.ISO).toBe(400);
    expect(merged?.ExposureTime).toBeCloseTo(0.004, 5);
    expect(merged?.latitude).toBe(52.1);
    expect(merged?.longitude).toBe(4.3);
    expect(merged?.GPSLatitude).toBeUndefined();
  });

  it('removes location when both coordinates are cleared', () => {
    const merged = mergeExifEdits(
      { latitude: 1, longitude: 2, GPSLatitudeRef: 'N' },
      {
        ...exifToFormValues(null),
        latitude: '',
        longitude: '',
      },
    );

    expect(merged?.latitude).toBeUndefined();
    expect(merged?.longitude).toBeUndefined();
    expect(merged?.GPSLatitudeRef).toBeUndefined();
  });
});

describe('getCommonExifFormValues', () => {
  it('returns shared field values and empty strings for mixed fields', () => {
    const common = getCommonExifFormValues([
      { exif_data: { Make: 'Canon', Model: 'R5', ISO: 400 } },
      { exif_data: { Make: 'Canon', Model: 'R6', ISO: 400 } },
    ]);

    expect(common.make).toBe('Canon');
    expect(common.model).toBe('');
    expect(common.iso).toBe('400');
  });
});

describe('mergeExifEditsPartial', () => {
  it('skips empty fields and preserves existing keys', () => {
    const merged = mergeExifEditsPartial(
      { Make: 'Nikon', Model: 'Z9', CustomTag: 'keep', ISO: 200 },
      {
        make: 'Canon',
        model: '',
        lensModel: '',
        iso: '',
        aperture: '',
        exposureTime: '',
        focalLength: '',
        captureTime: '',
        latitude: '',
        longitude: '',
      },
    );

    expect(merged?.Make).toBe('Canon');
    expect(merged?.Model).toBe('Z9');
    expect(merged?.ISO).toBe(200);
    expect(merged?.CustomTag).toBe('keep');
  });

  it('clears GPS when clearGps is set', () => {
    const merged = mergeExifEditsPartial(
      { latitude: 52, longitude: 4, GPSLatitudeRef: 'N' },
      {
        ...exifToFormValues(null),
        latitude: '',
        longitude: '',
      },
      { clearGps: true },
    );

    expect(merged?.latitude).toBeUndefined();
    expect(merged?.longitude).toBeUndefined();
    expect(merged?.GPSLatitudeRef).toBeUndefined();
  });
});

describe('exifGearFieldsChanged', () => {
  it('detects make/model/lens changes', () => {
    expect(
      exifGearFieldsChanged({ Make: 'Canon' }, { Make: 'Canon', Model: 'R5' }),
    ).toBe(true);
    expect(exifGearFieldsChanged({ Make: 'Canon' }, { Make: 'Canon' })).toBe(false);
  });
});

describe('Amsterdam capture time', () => {
  it('round-trips datetime-local in Europe/Amsterdam', () => {
    const utc = wallClockInTimeZoneToUtc(2016, 3, 27, 15, 31, 0, 'Europe/Amsterdam');
    const local = formatDateForDatetimeLocal(utc, 'Europe/Amsterdam');
    expect(local).toBe('2016-03-27T15:31');
    const back = parseDatetimeLocalInTimeZone(local, 'Europe/Amsterdam');
    expect(back?.toISOString()).toBe(utc.toISOString());
  });

  it('parses EXIF colon datetime as Amsterdam wall clock', () => {
    const formatted = getFormattedExif({
      DateTimeOriginal: '2016:03:27 15:31:00',
    });
    expect(formatted?.dateTaken).toBe('March 27, 2016 at 3:31 PM');
  });
});
