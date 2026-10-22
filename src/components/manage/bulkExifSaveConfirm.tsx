import type { ConfirmOptions } from '@/app/providers/ConfirmProvider';
import type { PhotoWithAlbums } from '@/types/photos';
import type { ExifEditFormValues } from '@/utils/exif';
import { emptyExifEditFormValues, exifToFormValues } from '@/utils/exif';

export type BulkExifChangeRow = {
  field: string;
  oldValue: string;
  newValue: string;
};

const FIELD_LABELS: Record<keyof ExifEditFormValues, string> = {
  camera: 'Camera',
  lensModel: 'Lens',
  iso: 'ISO',
  aperture: 'Aperture',
  exposureTime: 'Shutter speed',
  focalLength: 'Focal length',
  captureTime: 'Date taken',
  latitude: 'Latitude',
  longitude: 'Longitude',
};

const FIELD_ORDER: (keyof ExifEditFormValues)[] = [
  'camera',
  'lensModel',
  'iso',
  'aperture',
  'exposureTime',
  'focalLength',
  'captureTime',
];

function displayValue(value: string): string {
  const trimmed = value.trim();
  return trimmed || 'Not set';
}

function oldValueAcrossPhotos(
  photos: PhotoWithAlbums[],
  key: keyof ExifEditFormValues,
): string {
  const values = new Set<string>();
  for (const photo of photos) {
    const form = exifToFormValues(photo.exif_data as Record<string, unknown> | null | undefined);
    values.add(form[key].trim());
  }
  values.delete('');
  if (values.size === 0) return 'Not set';
  if (values.size === 1) return displayValue([...values][0] ?? '');
  return 'Mixed';
}

function oldLocationAcrossPhotos(photos: PhotoWithAlbums[]): string {
  const values = new Set<string>();
  for (const photo of photos) {
    const form = exifToFormValues(photo.exif_data as Record<string, unknown> | null | undefined);
    const lat = form.latitude.trim();
    const lng = form.longitude.trim();
    if (lat && lng) values.add(`${lat}, ${lng}`);
  }
  if (values.size === 0) return 'Not set';
  if (values.size === 1) return [...values][0] ?? 'Not set';
  return 'Mixed';
}

function fieldWouldChange(
  photos: PhotoWithAlbums[],
  key: keyof ExifEditFormValues,
  newRaw: string,
): boolean {
  const trimmed = newRaw.trim();
  if (!trimmed) return false;
  const old = oldValueAcrossPhotos(photos, key);
  const newDisplay = displayValue(trimmed);
  if (old === 'Mixed') return true;
  return old !== newDisplay;
}

export type BulkExifApplyPlan = {
  /** Form with only fields that differ from current values (for partial merge). */
  form: ExifEditFormValues;
  clearGps: boolean;
  changes: BulkExifChangeRow[];
};

/** What will actually be applied in bulk edit (ignores prefilled-but-unchanged fields). */
export function prepareBulkExifApply(
  photos: PhotoWithAlbums[],
  form: ExifEditFormValues,
  clearGps: boolean,
): BulkExifApplyPlan {
  const applyForm = emptyExifEditFormValues();
  const changes: BulkExifChangeRow[] = [];

  for (const key of FIELD_ORDER) {
    const newRaw = form[key];
    if (!fieldWouldChange(photos, key, newRaw)) continue;
    applyForm[key] = newRaw.trim();
    changes.push({
      field: FIELD_LABELS[key],
      oldValue: oldValueAcrossPhotos(photos, key),
      newValue: displayValue(newRaw),
    });
  }

  const lat = form.latitude.trim();
  const lng = form.longitude.trim();
  let applyClearGps = false;

  if (lat && lng) {
    const oldLoc = oldLocationAcrossPhotos(photos);
    const newLoc = `${lat}, ${lng}`;
    if (oldLoc !== newLoc) {
      applyForm.latitude = lat;
      applyForm.longitude = lng;
      changes.push({
        field: 'Location',
        oldValue: oldLoc,
        newValue: newLoc,
      });
    }
  } else if (clearGps) {
    const oldLoc = oldLocationAcrossPhotos(photos);
    if (oldLoc !== 'Not set') {
      applyClearGps = true;
      changes.push({
        field: 'Location',
        oldValue: oldLoc,
        newValue: 'Removed',
      });
    }
  }

  return { form: applyForm, clearGps: applyClearGps, changes };
}

function BulkExifChangesTable({ changes }: { changes: BulkExifChangeRow[] }) {
  return (
    <div
      className="max-h-[50vh] overflow-y-auto rounded-md border border-foreground/10"
    >
      <table
        className="w-full text-sm"
      >
        <thead
          className="sticky top-0 bg-background/95 text-left text-foreground/60"
        >
          <tr>
            <th
              className="px-3 py-2 font-medium"
              scope="col"
            >
              Field
            </th>
            <th
              className="px-3 py-2 font-medium"
              scope="col"
            >
              Current
            </th>
            <th
              className="px-3 py-2 font-medium"
              scope="col"
            >
              New
            </th>
          </tr>
        </thead>
        <tbody
          className="divide-y divide-foreground/10"
        >
          {changes.map((row) => (
            <tr
              key={row.field}
            >
              <td
                className="px-3 py-2 align-top font-medium whitespace-nowrap"
              >
                {row.field}
              </td>
              <td
                className="px-3 py-2 align-top text-foreground/70 break-words"
              >
                {row.oldValue}
              </td>
              <td
                className="px-3 py-2 align-top break-words"
              >
                {row.newValue}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function confirmBulkExifSave(
  photoCount: number,
  changes: BulkExifChangeRow[],
): ConfirmOptions {
  return {
    title: `Update capture details on ${photoCount} photo${photoCount !== 1 ? 's' : ''}?`,
    message:
      'The following capture details will be updated for all selected photos:',
    content: (
      <BulkExifChangesTable
        changes={changes}
      />
    ),
    size: 'medium',
    confirmLabel: 'Apply changes',
    variant: 'default',
  };
}
