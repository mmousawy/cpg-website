import { z } from 'zod';

import { exifBatchSchema } from '@/lib/photos/exifFormSchema';

const licenseTypeSchema = z.enum([
  'all-rights-reserved',
  'cc-by-nc-nd-4.0',
  'cc-by-nc-4.0',
  'cc-by-4.0',
  'cc0',
]);

const patchSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_public: z.boolean().nullable().optional(),
  license: licenseTypeSchema.nullable().optional(),
  tags: z.array(z.string()).max(5).optional(),
  originalCommonTags: z.array(z.string()).optional(),
});

const optionsSchema = z
  .object({
    tagMode: z.enum(['merge', 'replace']).default('merge'),
    /** When true, nullable patch fields overwrite DB values (single-photo edit). */
    applyUnsetFields: z.boolean().default(false),
    albumId: z.string().uuid().optional(),
  })
  .default({ tagMode: 'merge', applyUnsetFields: false });

export const batchUpdatePhotoDetailsBodySchema = z
  .object({
    photoIds: z.array(z.string().uuid()).min(1).max(500).optional(),
    patch: patchSchema.optional(),
    options: optionsSchema.optional(),
    sortOrderByPhotoId: z.record(z.string().uuid(), z.number().int().nonnegative()).optional(),
    exif: exifBatchSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const patch = data.patch ?? {};
    const applyUnsetFields = data.options?.applyUnsetFields ?? false;
    const hasSort = Boolean(
      data.sortOrderByPhotoId && Object.keys(data.sortOrderByPhotoId).length > 0,
    );
    const hasTags = patch.tags !== undefined;
    const hasBulkScalars = Boolean(
      patch.title
      || patch.description
      || (patch.is_public !== undefined && patch.is_public !== null)
      || patch.license,
    );
    const hasSingleScalars = applyUnsetFields && (
      patch.title !== undefined
      || patch.description !== undefined
      || (patch.is_public !== undefined && patch.is_public !== null)
      || (patch.license !== undefined && patch.license !== null)
    );
    const hasDetails = hasSort || hasTags || hasBulkScalars || hasSingleScalars;
    const hasExif = Boolean(data.exif);

    if (!hasDetails && !hasExif) {
      ctx.addIssue({
        code: 'custom',
        message: 'No updates requested',
        path: [],
      });
    }

    if (hasDetails && (!data.photoIds || data.photoIds.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'photoIds required for detail updates',
        path: ['photoIds'],
      });
    }
  });

export type BatchUpdatePhotoDetailsBody = z.infer<typeof batchUpdatePhotoDetailsBodySchema>;

export function bodyHasDetailUpdates(body: BatchUpdatePhotoDetailsBody): boolean {
  const patch = body.patch ?? {};
  const applyUnsetFields = body.options?.applyUnsetFields ?? false;
  const hasSort = Boolean(
    body.sortOrderByPhotoId && Object.keys(body.sortOrderByPhotoId).length > 0,
  );
  const hasTags = patch.tags !== undefined;
  const hasBulkScalars = Boolean(
    patch.title
    || patch.description
    || (patch.is_public !== undefined && patch.is_public !== null)
    || patch.license,
  );
  const hasSingleScalars = applyUnsetFields && (
    patch.title !== undefined
    || patch.description !== undefined
    || (patch.is_public !== undefined && patch.is_public !== null)
    || (patch.license !== undefined && patch.license !== null)
  );
  return hasSort || hasTags || hasBulkScalars || hasSingleScalars;
}

export function parseBatchUpdatePhotoDetailsBody(
  body: unknown,
): { ok: true; value: BatchUpdatePhotoDetailsBody } | { ok: false; message: string } {
  const parsed = batchUpdatePhotoDetailsBodySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return { ok: false, message };
  }
  return { ok: true, value: parsed.data };
}
