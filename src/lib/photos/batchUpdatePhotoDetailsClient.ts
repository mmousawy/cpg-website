import type { BulkPhotoFormData } from '@/components/manage/BulkPhotoEditForm';
import type { PhotoFormData } from '@/components/manage/SinglePhotoEditForm';
import type { BatchUpdatePhotoDetailsResult } from '@/lib/photos/batchUpdatePhotoDetails';
import type { AlbumPhotoBatchUpdate } from '@/lib/photos/batchUpdateAlbumPhotos';
import type { ExifEditFormValues, MergeExifEditsPartialOptions } from '@/utils/exif';
import { errorMessageFromFetchResponse } from '@/utils/userFacingHttpError';

type BatchApiResponse = BatchUpdatePhotoDetailsResult & { ok: true };

export async function patchPhotoDetailsBatch(
  body: Record<string, unknown>,
): Promise<BatchUpdatePhotoDetailsResult> {
  const response = await fetch('/api/photos/batch', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await errorMessageFromFetchResponse(response, 'Failed to update photos'));
  }

  const json = await response.json().catch(() => ({})) as Partial<BatchApiResponse>;

  return {
    photoIds: json.photoIds ?? [],
    affectedAlbumSlugs: json.affectedAlbumSlugs ?? [],
    affectedTags: json.affectedTags ?? [],
    newlyPublicPhotoIds: json.newlyPublicPhotoIds ?? [],
    visibilityChanged: json.visibilityChanged ?? false,
    exif: json.exif,
  };
}

export async function patchAlbumPhotosBatch(
  albumId: string,
  updates: AlbumPhotoBatchUpdate[],
): Promise<void> {
  const response = await fetch('/api/albums/photos/batch', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumId, updates }),
  });

  if (!response.ok) {
    throw new Error(await errorMessageFromFetchResponse(response, 'Failed to update album photos'));
  }
}

export function singlePhotoDetailsBatchBody(photoId: string, data: PhotoFormData) {
  return {
    photoIds: [photoId],
    patch: {
      title: data.title,
      description: data.description,
      is_public: data.is_public,
      license: data.license,
      tags: data.tags,
    },
    options: {
      tagMode: 'replace' as const,
      applyUnsetFields: true,
    },
  };
}

export function bulkPhotoDetailsBatchBody(
  photoIds: string[],
  data: BulkPhotoFormData,
  albumId?: string,
) {
  return {
    photoIds,
    patch: {
      title: data.title,
      description: data.description,
      is_public: data.is_public,
      license: data.license,
      tags: data.tags,
      originalCommonTags: data.originalCommonTags,
    },
    options: {
      tagMode: 'merge' as const,
      applyUnsetFields: false,
      ...(albumId ? { albumId } : {}),
    },
  };
}

export function reorderPhotosBatchBody(photos: { id: string }[]) {
  const sortOrderByPhotoId: Record<string, number> = {};
  photos.forEach((photo, index) => {
    sortOrderByPhotoId[photo.id] = index;
  });

  return {
    photoIds: photos.map((photo) => photo.id),
    patch: {},
    sortOrderByPhotoId,
  };
}

export function singlePhotoExifBatchBody(photoId: string, form: ExifEditFormValues) {
  return {
    exif: {
      action: 'apply' as const,
      photoIds: [photoId],
      form,
      partial: false,
    },
  };
}

export function clearPhotoExifBatchBody(photoIds: string[]) {
  return {
    exif: {
      action: 'clear' as const,
      photoIds,
    },
  };
}

export function bulkPhotoExifBatchBody(
  photoIds: string[],
  form: ExifEditFormValues,
  mergeOptions?: MergeExifEditsPartialOptions,
) {
  return {
    exif: {
      action: 'apply' as const,
      photoIds,
      form,
      partial: true,
      mergeOptions,
    },
  };
}

export function reorderAlbumPhotosBatchBody(
  photos: Array<{ album_photo_id?: string | null }>,
) {
  return photos
    .filter((photo) => photo.album_photo_id)
    .map((photo, index) => ({
      id: photo.album_photo_id!,
      sort_order: index,
    }));
}
