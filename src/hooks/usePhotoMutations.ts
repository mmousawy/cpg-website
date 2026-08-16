import { revalidateAlbum, revalidateGalleryData, revalidateHome, revalidateProfile } from '@/app/actions/revalidate';
import type { BulkPhotoFormData, PhotoFormData } from '@/components/manage';
import {
  getFlatPhotosFromCache,
  getPhotosInfiniteData,
  type PhotoFilter,
  type PhotosInfiniteData,
  photosQueryFilterKey,
  setAllPhotosQueriesFromFlat,
  updateAllPhotosQueries,
} from '@/hooks/photoQueryCache';
import { photoCountQueryKey } from '@/hooks/usePhotoCounts';
import type { PhotoWithAlbums } from '@/types/photos';
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
    { previousData: PhotosInfiniteData | undefined }
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
      if (userId && context?.previousData) {
        queryClient.setQueriesData<PhotosInfiniteData>(
          { queryKey: photosQueryFilterKey(userId, filter) },
          context.previousData,
        );
      }
    },
    onMutate: () => {
      if (!userId) return { previousData: undefined };
      const previousData = getPhotosInfiniteData(queryClient, userId, filter);
      return { previousData };
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
        await Promise.all([revalidateGalleryData(), revalidateHome()]);
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
  },
  Error,
  { photoId: string; data: PhotoFormData },
  { previousData: PhotosInfiniteData | undefined }
  >({
    onMutate: () => {
      if (!userId) return { previousData: undefined };
      return { previousData: getPhotosInfiniteData(queryClient, userId, filter) };
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

      const { error } = await supabase
        .from('photos')
        .update({
          title: data.title,
          description: data.description,
          is_public: data.is_public,
          license: data.license,
        })
        .eq('id', photoId)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message || 'Failed to update photo');
      }

      const previousPhoto = previousPhotos.find((p) => p.id === photoId);
      const previousTags = previousPhoto?.tags?.map((t) => (typeof t === 'string' ? t : t.tag).toLowerCase()) || [];
      const newTags = data.tags?.map((t) => t.toLowerCase()) || [];

      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      if (data.tags && data.tags.length > 0) {
        await supabase.from('photo_tags').insert(
          data.tags.map((tag) => ({ photo_id: photoId, tag: tag.toLowerCase() })),
        );
      }

      queryClient.invalidateQueries({ queryKey: ['global-tags'] });

      const { revalidateTagPhotos } = await import('@/app/actions/revalidate');
      const allAffectedTags = [...new Set([...previousTags, ...newTags])];
      await Promise.all(allAffectedTags.map((tag) => revalidateTagPhotos(tag)));

      const photo = previousPhotos.find((p) => p.id === photoId);
      const affectedAlbums = photo?.albums?.map((a) => a.slug) || [];
      const affectedAlbumIds = photo?.albums?.map((a) => a.id) || [];

      affectedAlbumIds.forEach((albumId) => {
        queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
      });

      return { photoId, data, previousPhotos, affectedAlbums };
    },
    onError: (_err, _variables, context) => {
      if (userId && context?.previousData) {
        queryClient.setQueriesData<PhotosInfiniteData>(
          { queryKey: photosQueryFilterKey(userId, filter) },
          context.previousData,
        );
      }
    },
    onSuccess: async (data) => {
      if (nickname) {
        await revalidateProfile(nickname);
        if (data.affectedAlbums.length > 0) {
          await Promise.all(data.affectedAlbums.map((slug) => revalidateAlbum(nickname, slug)));
        }
      }

      const previousPhoto = data.previousPhotos?.find((p) => p.id === data.photoId);
      if (previousPhoto && previousPhoto.is_public !== data.data.is_public) {
        await Promise.all([revalidateGalleryData(), revalidateHome()]);
      }

      if (previousPhoto && !previousPhoto.is_public && data.data.is_public) {
        void notifyFollowersOfUpload([data.photoId]);
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
  },
  Error,
  { photoIds: string[]; data: BulkPhotoFormData },
  { previousData: PhotosInfiniteData | undefined }
  >({
    onMutate: () => {
      if (!userId) return { previousData: undefined };
      return { previousData: getPhotosInfiniteData(queryClient, userId, filter) };
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

      const updates = photoIds.map((id) => ({
        id,
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.is_public !== null && { is_public: data.is_public }),
        ...(data.license && { license: data.license }),
      }));

      const { error } = await supabase.rpc('batch_update_photos', {
        photo_updates: updates,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update photos');
      }

      if (data.tags !== undefined) {
        const desiredTags = new Set(data.tags.map((t) => t.toLowerCase()));
        const originalCommonTags = new Set(
          (data.originalCommonTags || []).map((t) => t.toLowerCase()),
        );
        const explicitlyRemovedTags = new Set(
          [...originalCommonTags].filter((tag) => !desiredTags.has(tag)),
        );

        const { data: existingTags } = await supabase
          .from('photo_tags')
          .select('photo_id, tag')
          .in('photo_id', photoIds);

        const tagsByPhoto = new Map<string, Set<string>>();
        existingTags?.forEach(({ photo_id, tag }) => {
          if (!tagsByPhoto.has(photo_id)) {
            tagsByPhoto.set(photo_id, new Set());
          }
          tagsByPhoto.get(photo_id)!.add(tag.toLowerCase());
        });

        const tagInserts: { photo_id: string; tag: string }[] = [];
        const tagDeletes: { photo_id: string; tag: string }[] = [];

        photoIds.forEach((photoId) => {
          const existing = tagsByPhoto.get(photoId) || new Set();

          desiredTags.forEach((tag) => {
            if (!existing.has(tag) && existing.size + tagInserts.filter((t) => t.photo_id === photoId).length < 5) {
              tagInserts.push({ photo_id: photoId, tag });
            }
          });

          existing.forEach((tag) => {
            if (explicitlyRemovedTags.has(tag)) {
              tagDeletes.push({ photo_id: photoId, tag });
            }
          });
        });

        if (tagDeletes.length > 0) {
          for (const { photo_id, tag } of tagDeletes) {
            const { error: deleteError } = await supabase
              .from('photo_tags')
              .delete()
              .eq('photo_id', photo_id)
              .eq('tag', tag);
            if (deleteError) {
              throw new Error(deleteError.message || 'Failed to remove tags');
            }
          }
        }

        if (tagInserts.length > 0) {
          const { error: tagError } = await supabase.from('photo_tags').insert(tagInserts);
          if (tagError) {
            throw new Error(tagError.message || 'Failed to add tags');
          }
        }

        queryClient.invalidateQueries({ queryKey: ['global-tags'] });

        const { revalidateTagPhotos } = await import('@/app/actions/revalidate');
        const allAffectedTags = new Set([...desiredTags, ...explicitlyRemovedTags]);
        await Promise.all([...allAffectedTags].map((tag) => revalidateTagPhotos(tag)));
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

      return { photoIds, data, previousPhotos, affectedAlbums: Array.from(affectedAlbums) };
    },
    onError: (_err, _variables, context) => {
      if (userId && context?.previousData) {
        queryClient.setQueriesData<PhotosInfiniteData>(
          { queryKey: photosQueryFilterKey(userId, filter) },
          context.previousData,
        );
      }
    },
    onSuccess: async (data) => {
      if (nickname) {
        await revalidateProfile(nickname);
        if (data.affectedAlbums.length > 0) {
          await Promise.all(data.affectedAlbums.map((slug) => revalidateAlbum(nickname, slug)));
        }
      }

      if (data.data.is_public !== null) {
        const anyVisibilityChanged = data.previousPhotos?.some(
          (p) => data.photoIds.includes(p.id) && p.is_public !== data.data.is_public,
        );
        if (anyVisibilityChanged) {
          await Promise.all([revalidateGalleryData(), revalidateHome()]);
        }
      }

      if (data.data.is_public === true) {
        const newlyPublicIds = data.previousPhotos
          ?.filter((p) => data.photoIds.includes(p.id) && !p.is_public)
          .map((p) => p.id) ?? [];
        if (newlyPublicIds.length > 0) {
          void notifyFollowersOfUpload(newlyPublicIds);
        }
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
    { previousData: PhotosInfiniteData | undefined }
  >({
    onMutate: async (photos: PhotoWithAlbums[]) => {
      await queryClient.cancelQueries({ queryKey: photosQueryFilterKey(userId!, filter) });
      const previousData = getPhotosInfiniteData(queryClient, userId!, filter);
      setAllPhotosQueriesFromFlat(queryClient, userId!, filter, photos);
      return { previousData };
    },
    mutationFn: async (photos: PhotoWithAlbums[]) => {
      if (!userId) throw new Error('User not authenticated');

      const updates = photos.map((photo, index) => ({
        id: photo.id,
        sort_order: index,
      }));

      const { error } = await supabase.rpc('batch_update_photos', {
        photo_updates: updates,
      });

      if (error) {
        throw new Error(error.message || 'Failed to reorder photos');
      }

      return { photos };
    },
    onError: (_err, _variables, context) => {
      if (userId && context?.previousData) {
        queryClient.setQueriesData<PhotosInfiniteData>(
          { queryKey: photosQueryFilterKey(userId, filter) },
          context.previousData,
        );
      }
    },
    onSuccess: async () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: photosQueryFilterKey(userId, filter) });
      }
      if (nickname) {
        await revalidateProfile(nickname);
      }
    },
  });
}
