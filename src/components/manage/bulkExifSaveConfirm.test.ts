import { describe, expect, it } from 'vitest';

import { prepareBulkExifApply } from '@/components/manage/bulkExifSaveConfirm';
import { emptyExifEditFormValues } from '@/utils/exif';
import type { PhotoWithAlbums } from '@/types/photos';

function photo(exif: Record<string, unknown> | null): PhotoWithAlbums {
  return {
    id: '1',
    exif_data: exif,
  } as PhotoWithAlbums;
}

describe('prepareBulkExifApply', () => {
  it('lists only fields that change values', () => {
    const { changes } = prepareBulkExifApply(
      [
        photo({ Make: 'Canon', Model: 'R5', ISO: 400 }),
        photo({ Make: 'Nikon', Model: 'Z9', ISO: 800 }),
      ],
      {
        ...emptyExifEditFormValues(),
        camera: 'Canon EOS R6',
        iso: '',
      },
      false,
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      field: 'Camera',
      oldValue: 'Mixed',
      newValue: 'Canon EOS R6',
    });
  });

  it('skips prefilled fields that match every photo', () => {
    const { changes, form } = prepareBulkExifApply(
      [
        photo({ Make: 'Canon', Model: 'EOS R7', ISO: 100, LensModel: 'Old lens' }),
        photo({ Make: 'Canon', Model: 'EOS R7', ISO: 100, LensModel: 'Old lens' }),
      ],
      {
        ...emptyExifEditFormValues(),
        camera: 'Canon EOS R7',
        iso: '100',
        lensModel: 'New lens',
      },
      false,
    );

    expect(changes).toHaveLength(1);
    expect(changes[0]?.field).toBe('Lens');
    expect(form.camera).toBe('');
    expect(form.iso).toBe('');
    expect(form.lensModel).toBe('New lens');
  });

  it('includes location removal when clearGps is set', () => {
    const { changes } = prepareBulkExifApply(
      [photo({ latitude: 52.1, longitude: 4.3 })],
      emptyExifEditFormValues(),
      true,
    );

    expect(changes).toEqual([
      {
        field: 'Location',
        oldValue: '52.1, 4.3',
        newValue: 'Removed',
      },
    ]);
  });
});
