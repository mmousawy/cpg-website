import { revalidateAlbum, revalidateGalleryData, revalidatePhoto, revalidateProfile } from '@/app/actions/revalidate';
import type { BulkPhotoFormData, PhotoFormData } from '@/components/manage';
import {
  getFlatPhotosFromCache,
  type PhotoFilter,
  type PhotosInfiniteData,
  type PhotosQueriesSnapshot,
  photosQueryFilterKey,
  restorePhotosQueriesSnapshot,
  setAllPhotosQueriesFromFlat,
  snapshotPhotosQueries,
  updateAllPhotosQueries,
} from '@/hooks/photoQueryCache';
import { photoCountQueryKey } from '@/hooks/usePhotoCounts';
import type { Json } from '@/database.types';
import type { PhotoWithAlbums } from '@/types/photos';
import type { ExifEditFormValues } from '@/utils/exif';
import {
  exifGearFieldsChanged,
  mergeExifEdits,
  mergeExifEditsPartial,
  type MergeExifEditsPartialOptions,
} from '@/utils/exif';
import {
  bulkPhotoDetailsBatchBody,
  bulkPhotoExifBatchBody,
  clearPhotoExifBatchBody,
  patchPhotoDetailsBatch,
  reorderPhotosBatchBody,
  singlePhotoDetailsBatchBody,
  singlePhotoExifBatchBody,
} from '@/lib/photos/batchUpdatePhotoDetailsClient';
import { notifyFollowersOfUpload } from '@/utils/notifyFollowersOfUpload';
import { supabase } from '@/utils/supabase/client';
import { deleteUserStorageFiles } from '@/utils/supabaseStorage';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function markPhotosExiting(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  photoIds: string[],
  filter: PhotoFilter,
) {
  updateAllPhotosQueries(queryClient, userId, filter, (photos) =>
    photos.map((p) => (photoIds.includes(p.id) ? { ...p, isExiting: true } : p)),
  );
}

function removePhotosFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  photoIds: string[],
  filter: PhotoFilter,
) {
  updateAllPhotosQueries(queryClient, userId, filter, (photos) =>
    photos.filter((p) => !photoIds.includes(p.id)),
  );
}

export function useDeletePhotos(
  userId: string | undefined,
  filter: PhotoFilter = 'all',
  nickname?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      photoIds: string[];
      previousPhotos: PhotoWithAlbums[] | undefined;
      affectedAlbums: string[];
    },
    Error,
    { photoIds: string[]; storagePaths: string[] },
    { photosQueriesSnapshot: PhotosQueriesSnapshot | undefined }
  >({
    mutationFn: async ({ photoIds, storagePaths }: { photoIds: string[]; storagePaths: string[] }) => {
      if (!userId) throw new Error('User not authenticated');

      markPhotosExiting(queryClient, userId, photoIds, filter);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const previousPhotos = getFlatPhotosFromCache(queryClient, userId, filter);
      removePhotosFromCache(queryClient, userId, photoIds, filter);

      if (storagePaths.length > 0) {
        await deleteUserStorageFiles('user-photos', storagePaths);
      }

      const { error } = await supabase.rpc('bulk_delete_photos', {
        p_photo_ids: photoIds,
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete photos');
      }

      const affectedAlbums = previousPhotos
        .filter((p) => photoIds.includes(p.id))
        .flatMap((p) => p.albums || [])
        .map((a) => a.slug);

      return { photoIds, previousPhotos, affectedAlbums };
    },
    onError: (_err, _variables, context) => {
      if (userId) {
        restorePhotosQueriesSnapshot(queryClient, context?.photosQueriesSnapshot);
      }
    },
    onMutate: () => {
      if (!userId) return { photosQueriesSnapshot: undefined };
      return { photosQueriesSnapshot: snapshotPhotosQueries(queryClient, userId, filter) };
    },
    onSuccess: async (data) => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: photoCountQueryKey(userId) });
      }

      const deletedPhotos = data.previousPhotos?.filter((p) => data.photoIds.includes(p.id)) ?? [];
      const affectedTags = new Set<string>();
      for (const photo of deletedPhotos) {
        photo.tags?.forEach((t) => {
          const tag = typeof t === 'string' ? t : t.tag;
          if (tag) affectedTags.add(tag.toLowerCase());
        });
      }
      if (affectedTags.size > 0) {
        const { revalidateTagPhotos } = await import('@/app/actions/revalidate');
        await Promise.all([...affectedTags].map((tag) => revalidateTagPhotos(tag)));
      }

      if (nickname) {
        const { revalidatePhoto } = await import('@/app/actions/revalidate');
        const shortIds = deletedPhotos
          .map((p) => p.short_id)
          .filter((id): id is string => !!id);
        await Promise.all(shortIds.map((shortId) => revalidatePhoto(shortId, nickname)));
        await revalidateProfile(nickname);
        if (data.affectedAlbums.length > 0) {
          await Promise.all(data.affectedAlbums.map((slug) => revalidateAlbum(nickname, slug)));
        }
      }

      const hadPublicPhotos = deletedPhotos.some((p) => p.is_public);
      if (hadPublicPhotos) {
        await revalidateGalleryData(nickname);
      }
    },
  });
}

export function useUpdatePhoto(
  userId: string | undefined,
  filter: PhotoFilter = 'all',
  nickname?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      photoId: string;
      data: PhotoFormData;
      previousPhotos: PhotoWithAlbums[] | undefined;
      affectedAlbums: string[];
      batchResult: Awaited<ReturnType<typeof patchPhotoDetailsBatch>>;
    },
    Error,
    { photoId: string; data: PhotoFormData },
    { photosQueriesSnapshot: PhotosQueriesSnapshot | undefined }
  >({
    onMutate: () => {
      if (!userId) return { photosQueriesSnapshot: undefined };
      return { photosQueriesSnapshot: snapshotPhotosQueries(queryClient, userId, filter) };
    },
    mutationFn: async ({ photoId, data }: { photoId: string; data: PhotoFormData }) => {
      if (!userId) throw new Error('User not authenticated');

      const previousPhotos = getFlatPhotosFromCache(queryClient, userId, filter);

      updateAllPhotosQueries(queryClient, userId, filter, (photos) =>
        photos.map((p) =>
          p.id === photoId
            ? {
              ...p,
              title: data.title,
              description: data.description,
              is_public: data.is_public,
              license: data.license,
              tags: data.tags?.map((tag) => ({ tag: tag.toLowerCase() })) || [],
            }
            : p,
        ),
      );

      const batchResult = await patchPhotoDetailsBatch(singlePhotoDetailsBatchBody(photoId, data));

      queryClient.invalidateQueries({ queryKey: ['global-tags'] });

      const photo = previousPhotos.find((p) => p.id === photoId);
      const affectedAlbums = photo?.albums?.map((a) => a.slug) || [];
      const affectedAlbumIds = photo?.albums?.map((a) => a.id) || [];

      affectedAlbumIds.forEach((albumId) => {
        queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
      });

      return { photoId, data, previousPhotos, affectedAlbums, batchResult };
    },
    onError: (_err, _variables, context) => {
      if (userId) {
        restorePhotosQueriesSnapshot(queryClient, context?.photosQueriesSnapshot);
      }
    },
    onSuccess: async (data) => {
      if (data.batchResult.newlyPublicPhotoIds.length > 0) {
        await notifyFollowersOfUpload(data.batchResult.newlyPublicPhotoIds);
      }
    },
  });
}

export function useBulkUpdatePhotos(
  userId: string | undefined,
  filter: PhotoFilter = 'all',
  nickname?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      photoIds: string[];
      data: BulkPhotoFormData;
      previousPhotos: PhotoWithAlbums[] | undefined;
      affectedAlbums: string[];
      batchResult: Awaited<ReturnType<typeof patchPhotoDetailsBatch>>;
    },
    Error,
    { photoIds: string[]; data: BulkPhotoFormData },
    { photosQueriesSnapshot: PhotosQueriesSnapshot | undefined }
  >({
    onMutate: () => {
      if (!userId) return { photosQueriesSnapshot: undefined };
      return { photosQueriesSnapshot: snapshotPhotosQueries(queryClient, userId, filter) };
    },
    mutationFn: async ({ photoIds, data }: { photoIds: string[]; data: BulkPhotoFormData }) => {
      if (!userId) throw new Error('User not authenticated');

      const previousPhotos = getFlatPhotosFromCache(queryClient, userId, filter);

      const desiredTagsForCache = data.tags !== undefined
        ? new Set(data.tags.map((t) => t.toLowerCase()))
        : null;
      const originalCommonTagsForCache = data.originalCommonTags
        ? new Set(data.originalCommonTags.map((t) => t.toLowerCase()))
        : new Set<string>();
      const explicitlyRemovedTagsForCache = desiredTagsForCache
        ? new Set([...originalCommonTagsForCache].filter((tag) => !desiredTagsForCache.has(tag)))
        : new Set<string>();

      updateAllPhotosQueries(queryClient, userId, filter, (photos) =>
        photos.map((p) => {
          if (!photoIds.includes(p.id)) return p;

          let newTags = p.tags;
          if (desiredTagsForCache !== null) {
            const existingTags = p.tags?.map((t) => t.tag.toLowerCase()) || [];
            const keptTags = existingTags.filter(
              (tag) => desiredTagsForCache.has(tag) || !explicitlyRemovedTagsForCache.has(tag),
            );
            const tagsToAdd = [...desiredTagsForCache].filter((tag) => !existingTags.includes(tag));
            newTags = [...new Set([...keptTags, ...tagsToAdd])].map((tag) => ({ tag }));
          }

          return {
            ...p,
            ...(data.title && { title: data.title }),
            ...(data.description && { description: data.description }),
            ...(data.is_public !== null && { is_public: data.is_public }),
            ...(data.license && { license: data.license }),
            ...(desiredTagsForCache !== null && { tags: newTags }),
          };
        }),
      );

      const batchResult = await patchPhotoDetailsBatch(bulkPhotoDetailsBatchBody(photoIds, data));

      if (data.tags !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['global-tags'] });
      }

      const affectedAlbums = new Set<string>();
      const affectedAlbumIds = new Set<string>();
      previousPhotos.forEach((p) => {
        if (photoIds.includes(p.id)) {
          p.albums?.forEach((a) => {
            affectedAlbums.add(a.slug);
            affectedAlbumIds.add(a.id);
          });
        }
      });

      affectedAlbumIds.forEach((albumId) => {
        queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
      });

      return {
        photoIds,
        data,
        previousPhotos,
        affectedAlbums: Array.from(affectedAlbums),
        batchResult,
      };
    },
    onError: (_err, _variables, context) => {
      if (userId) {
        restorePhotosQueriesSnapshot(queryClient, context?.photosQueriesSnapshot);
      }
    },
    onSuccess: async (data) => {
      if (data.batchResult.newlyPublicPhotoIds.length > 0) {
        await notifyFollowersOfUpload(data.batchResult.newlyPublicPhotoIds);
      }
    },
  });
}

export function useReorderPhotos(
  userId: string | undefined,
  filter: PhotoFilter = 'all',
  nickname?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    { photos: PhotoWithAlbums[] },
    Error,
    PhotoWithAlbums[],
    { photosQueriesSnapshot: PhotosQueriesSnapshot | undefined }
  >({
    onMutate: async (photos: PhotoWithAlbums[]) => {
      await queryClient.cancelQueries({ queryKey: photosQueryFilterKey(userId!, filter) });
      const photosQueriesSnapshot = snapshotPhotosQueries(queryClient, userId!, filter);
      setAllPhotosQueriesFromFlat(queryClient, userId!, filter, photos);
      return { photosQueriesSnapshot };
    },
    mutationFn: async (photos: PhotoWithAlbums[]) => {
      if (!userId) throw new Error('User not authenticated');

      await patchPhotoDetailsBatch(reorderPhotosBatchBody(photos));

      return { photos };
    },
    onError: (_err, _variables, context) => {
      if (userId) {
        restorePhotosQueriesSnapshot(queryClient, context?.photosQueriesSnapshot);
      }
    },
    onSuccess: async () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: photosQueryFilterKey(userId, filter) });
      }
    },
  });
}

function patchPhotoExifInAlbumCache(
  queryClient: ReturnType<typeof useQueryClient>,
  albumId: string,
  photoId: string,
  exifData: Record<string, unknown> | null,
) {
  const jsonExif = exifData as Json;
  queryClient.setQueryData<PhotoWithAlbums[]>(['album-photos', albumId], (old) => {
    if (!old) return old;
    return old.map((p) => (p.id === photoId ? { ...p, exif_data: jsonExif } : p));
  });
}

export type UpdatePhotoExifInput =
  | { photoId: string; clearAll: true }
  | { photoId: string; form: ExifEditFormValues; existingExif?: Record<string, unknown> | null };

export function useUpdatePhotoExif(
  userId: string | undefined,
  filter: PhotoFilter = 'all',
  nickname?: string | null,
  albumId?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      photoId: string;
      exifData: Record<string, unknown> | null;
      shortId: string | null;
      gearChanged: boolean;
    },
    Error,
    UpdatePhotoExifInput,
    { photosQueriesSnapshot: PhotosQueriesSnapshot | undefined; previousAlbumPhotos: PhotoWithAlbums[] | undefined }
  >({
    onMutate: (variables) => {
      const { photoId } = variables;
      const photosQueriesSnapshot = userId
        ? snapshotPhotosQueries(queryClient, userId, filter)
        : undefined;
      const merged = 'clearAll' in variables
        ? null
        : mergeExifEdits(variables.existingExif, variables.form);
      if (userId) {
        updateAllPhotosQueries(queryClient, userId, filter, (photos) =>
          photos.map((p) => (p.id === photoId ? { ...p, exif_data: merged as Json } : p)),
        );
      }
      if (albumId) {
        patchPhotoExifInAlbumCache(queryClient, albumId, photoId, merged);
      }
      return {
        photosQueriesSnapshot,
        previousAlbumPhotos: albumId
          ? queryClient.getQueryData<PhotoWithAlbums[]>(['album-photos', albumId])
          : undefined,
      };
    },
    mutationFn: async (variables) => {
      if (!userId) throw new Error('User not authenticated');

      const { photoId } = variables;
      const cached = getFlatPhotosFromCache(queryClient, userId, filter).find((p) => p.id === photoId);
      const existingExif = 'clearAll' in variables
        ? undefined
        : variables.existingExif;
      const baseExif = (existingExif ?? cached?.exif_data) as Record<string, unknown> | null | undefined;

      const merged = 'clearAll' in variables
        ? null
        : mergeExifEdits(baseExif, variables.form);
      const gearChanged = exifGearFieldsChanged(baseExif, merged);

      const batchResult = 'clearAll' in variables
        ? await patchPhotoDetailsBatch(clearPhotoExifBatchBody([photoId]))
        : await patchPhotoDetailsBatch(singlePhotoExifBatchBody(photoId, variables.form));

      const exifRow = batchResult.exif?.results.find((row) => row.photoId === photoId);

      if (albumId) {
        patchPhotoExifInAlbumCache(queryClient, albumId, photoId, merged);
      }

      return {
        photoId,
        exifData: merged,
        shortId: exifRow?.shortId ?? cached?.short_id ?? null,
        gearChanged: exifRow?.gearChanged ?? gearChanged,
      };
    },
    onError: (_err, _variables, context) => {
      if (userId) {
        restorePhotosQueriesSnapshot(queryClient, context?.photosQueriesSnapshot);
      }
      if (albumId && context?.previousAlbumPhotos) {
        queryClient.setQueryData(['album-photos', albumId], context.previousAlbumPhotos);
      }
    },
  });
}

export type BulkUpdatePhotoExifInput =
  | { photoIds: string[]; clearAll: true }
  | {
    photoIds: string[];
    form: ExifEditFormValues;
    mergeOptions?: MergeExifEditsPartialOptions;
    /** EXIF JSON from the selection (modal); avoids merging from an incomplete React Query cache. */
    exifBaseByPhotoId?: Record<string, Record<string, unknown> | null | undefined>;
  };

function exifBaseForBulkPhoto(
  photoId: string,
  exifBaseByPhotoId: Record<string, Record<string, unknown> | null | undefined> | undefined,
  flat: PhotoWithAlbums[],
): Record<string, unknown> | null | undefined {
  if (exifBaseByPhotoId && Object.prototype.hasOwnProperty.call(exifBaseByPhotoId, photoId)) {
    const base = exifBaseByPhotoId[photoId];
    if (base && typeof base === 'object') return base;
    return base ?? null;
  }
  const cached = flat.find((p) => p.id === photoId);
  return cached?.exif_data as Record<string, unknown> | null | undefined;
}

export function useBulkUpdatePhotoExif(
  userId: string | undefined,
  filter: PhotoFilter = 'all',
  nickname?: string | null,
  albumId?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      results: Array<{
        photoId: string;
        exifData: Record<string, unknown> | null;
        shortId: string | null;
        gearChanged: boolean;
      }>;
    },
    Error,
    BulkUpdatePhotoExifInput,
    { photosQueriesSnapshot: PhotosQueriesSnapshot | undefined; previousAlbumPhotos: PhotoWithAlbums[] | undefined }
  >({
    onMutate: (variables) => {
      const { photoIds } = variables;
      const photosQueriesSnapshot = userId
        ? snapshotPhotosQueries(queryClient, userId, filter)
        : undefined;
      const flat = userId ? getFlatPhotosFromCache(queryClient, userId, filter) : [];
      const mergeOptions = 'clearAll' in variables ? undefined : variables.mergeOptions;
      const form = 'clearAll' in variables ? undefined : variables.form;
      const exifBaseByPhotoId = 'clearAll' in variables ? undefined : variables.exifBaseByPhotoId;

      const patchMap = new Map<string, Record<string, unknown> | null>();
      for (const photoId of photoIds) {
        const baseExif = exifBaseForBulkPhoto(photoId, exifBaseByPhotoId, flat);
        const merged = 'clearAll' in variables
          ? null
          : mergeExifEditsPartial(baseExif, form!, mergeOptions);
        patchMap.set(photoId, merged);
      }

      if (userId) {
        updateAllPhotosQueries(queryClient, userId, filter, (photos) =>
          photos.map((p) => {
            const next = patchMap.get(p.id);
            if (next === undefined) return p;
            return { ...p, exif_data: next as Json };
          }),
        );
      }
      if (albumId) {
        for (const [photoId, exifData] of patchMap) {
          patchPhotoExifInAlbumCache(queryClient, albumId, photoId, exifData);
        }
      }

      return {
        photosQueriesSnapshot,
        previousAlbumPhotos: albumId
          ? queryClient.getQueryData<PhotoWithAlbums[]>(['album-photos', albumId])
          : undefined,
      };
    },
    mutationFn: async (variables) => {
      if (!userId) throw new Error('User not authenticated');

      const { photoIds } = variables;
      const flat = getFlatPhotosFromCache(queryClient, userId, filter);
      const mergeOptions = 'clearAll' in variables ? undefined : variables.mergeOptions;
      const form = 'clearAll' in variables ? undefined : variables.form;
      const exifBaseByPhotoId = 'clearAll' in variables ? undefined : variables.exifBaseByPhotoId;

      const batchResult = 'clearAll' in variables
        ? await patchPhotoDetailsBatch(clearPhotoExifBatchBody(photoIds))
        : await patchPhotoDetailsBatch(bulkPhotoExifBatchBody(photoIds, form!, mergeOptions));

      const results = photoIds.map((photoId) => {
        const cached = flat.find((p) => p.id === photoId);
        const baseExif = exifBaseForBulkPhoto(photoId, exifBaseByPhotoId, flat);
        const merged = 'clearAll' in variables
          ? null
          : mergeExifEditsPartial(baseExif, form!, mergeOptions);
        const exifRow = batchResult.exif?.results.find((row) => row.photoId === photoId);

        return {
          photoId,
          exifData: merged,
          shortId: exifRow?.shortId ?? cached?.short_id ?? null,
          gearChanged: exifRow?.gearChanged ?? exifGearFieldsChanged(baseExif, merged),
        };
      });

      return { results };
    },
    onSuccess: (data, variables) => {
      if (!userId) return;
      const resultById = new Map(data.results.map((row) => [row.photoId, row]));
      updateAllPhotosQueries(queryClient, userId, filter, (photos) =>
        photos.map((p) => {
          const row = resultById.get(p.id);
          if (!row) return p;
          return { ...p, exif_data: row.exifData as Json };
        }),
      );
      if (albumId) {
        for (const row of data.results) {
          patchPhotoExifInAlbumCache(queryClient, albumId, row.photoId, row.exifData);
        }
      }
    },
    onError: (_err, _variables, context) => {
      if (userId) {
        restorePhotosQueriesSnapshot(queryClient, context?.photosQueriesSnapshot);
      }
      if (albumId && context?.previousAlbumPhotos) {
        queryClient.setQueryData(['album-photos', albumId], context.previousAlbumPhotos);
      }
    },
  });
}
