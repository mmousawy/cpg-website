import { z } from 'zod';

import type { ExifEditFormValues } from '@/utils/exif';

export const exifEditFormSchema = z.object({
  camera: z.string(),
  lensModel: z.string(),
  iso: z.string(),
  aperture: z.string(),
  exposureTime: z.string(),
  focalLength: z.string(),
  captureTime: z.string(),
  latitude: z.string(),
  longitude: z.string(),
});

export const exifBatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('clear'),
    photoIds: z.array(z.string().uuid()).min(1).max(500),
  }),
  z.object({
    action: z.literal('apply'),
    photoIds: z.array(z.string().uuid()).min(1).max(500),
    form: exifEditFormSchema,
    partial: z.boolean().default(false),
    mergeOptions: z
      .object({
        clearGps: z.boolean().optional(),
      })
      .optional(),
  }),
]);

export type ExifBatchInput = z.infer<typeof exifBatchSchema>;

export function toExifFormValues(form: z.infer<typeof exifEditFormSchema>): ExifEditFormValues {
  return form;
}
