import { revalidateAlbum, revalidateProfile } from '@/app/actions/revalidate';
import type { BulkPhotoFormData, PhotoFormData } from '@/components/manage';
import type { PhotoWithAlbums } from '@/types/photos';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type PhotoFilter = 'all' | 'public' | 'private';

// Helper to update photos in cache with isExiting flag
function markPhotosExiting(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  photoIds: string[],
  filter: PhotoFilter,
) {
  queryClient.setQueryData<PhotoWithAlbums[]>(['photos', userId, filter], (old) => {
    if (!old) return old;
    return old.map((p) => (photoIds.includes(p.id) ? { ...p, isExiting: true } : p));
  });
}

// Helper to remove photos from cache
function removePhotosFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  photoIds: string[],
  filter: PhotoFilter,
) {
  queryClient.setQueryData<PhotoWithAlbums[]>(['photos', userId, filter], (old) => {
    if (!old) return old;
    return old.filter((p) => !photoIds.includes(p.id));
  });
}

export function useDeletePhotos(
  userId: string | undefined,
  filter: PhotoFilter = 'all',
  nickname?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation<
    { photoIds: string[]; previousPhotos: PhotoWithAlbums[] | undefined; affectedAlbums: string[] },
    Error,
    { photoIds: string[]; storagePaths: string[] },
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async ({ photoIds, storagePaths }: { photoIds: string[]; storagePaths: string[] }) => {
      if (!userId) throw new Error('User not authenticated');

      // Mark photos for exit animation
      markPhotosExiting(queryClient, userId, photoIds, filter);

      // Wait for animation (300ms)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Optimistically remove from cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['photos', userId, filter]);
      removePhotosFromCache(queryClient, userId, photoIds, filter);

      // Delete storage files
      if (storagePaths.length > 0) {
        await supabase.storage.from('user-photos').remove(storagePaths);
      }

      // Delete photo records
      const { error } = await supabase.rpc('bulk_delete_photos', {
        p_photo_ids: photoIds,
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete photos');
      }

      // Get affected albums for revalidation
      const affectedAlbums = previousPhotos
        ?.filter((p) => photoIds.includes(p.id))
        .flatMap((p) => p.albums || [])
        .map((a) => a.slug) || [];

      return { photoIds, previousPhotos, affectedAlbums };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (userId && context?.previousPhotos) {
        queryClient.setQueryData(['photos', userId, filter], context.previousPhotos);
      }
    },
    onSuccess: async (data) => {
      // Invalidate counts
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['counts', userId] });
      }

      // Revalidate profile (photostream) and affected albums
      if (nickname) {
        await revalidateProfile(nickname);
        if (data.affectedAlbums.length > 0) {
          await Promise.all(data.affectedAlbums.map((slug) => revalidateAlbum(nickname, slug)));
        }
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
    { photoId: string; data: PhotoFormData; previousPhotos: PhotoWithAlbums[] | undefined; affectedAlbums: string[] },
    Error,
    { photoId: string; data: PhotoFormData },
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async ({ photoId, data }: { photoId: string; data: PhotoFormData }) => {
      if (!userId) throw new Error('User not authenticated');

      // Optimistically update cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['photos', userId, filter]);
      queryClient.setQueryData<PhotoWithAlbums[]>(['photos', userId, filter], (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === photoId
            ? {
              ...p,
              title: data.title,
              description: data.description,
              is_public: data.is_public,
              tags: data.tags?.map((tag) => ({ tag: tag.toLowerCase() })) || [],
            }
            : p,
        );
      });

      const { error } = await supabase
        .from('photos')
        .update({
          title: data.title,
          description: data.description,
          is_public: data.is_public,
        })
        .eq('id', photoId)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message || 'Failed to update photo');
      }

      // Get previous tags before updating
      const previousPhoto = previousPhotos?.find((p) => p.id === photoId);
      const previousTags = previousPhoto?.tags?.map((t) => (typeof t === 'string' ? t : t.tag).toLowerCase()) || [];
      const newTags = data.tags?.map((t) => t.toLowerCase()) || [];

      // Update tags - delete existing and insert new ones
      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      if (data.tags && data.tags.length > 0) {
        await supabase.from('photo_tags').insert(
          data.tags.map((tag) => ({ photo_id: photoId, tag: tag.toLowerCase() })),
        );
      }

      // Invalidate global tags cache
      queryClient.invalidateQueries({ queryKey: ['global-tags'] });

      // Revalidate tag-specific member pages for changed tags
      const { revalidateTagPhotos } = await import('@/app/actions/revalidate');
      const allAffectedTags = [...new Set([...previousTags, ...newTags])];
      await Promise.all(allAffectedTags.map((tag) => revalidateTagPhotos(tag)));

      // Get affected albums for revalidation and cache invalidation
      const photo = previousPhotos?.find((p) => p.id === photoId);
      const affectedAlbums = photo?.albums?.map((a) => a.slug) || [];
      const affectedAlbumIds = photo?.albums?.map((a) => a.id) || [];

      // Invalidate album photos caches to ensure tags show up when viewing photos in albums
      affectedAlbumIds.forEach((albumId) => {
        queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
      });

      return { photoId, data, previousPhotos, affectedAlbums };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (userId && context?.previousPhotos) {
        queryClient.setQueryData(['photos', userId, filter], context.previousPhotos);
      }
    },
    onSuccess: async (data) => {
      // Revalidate profile (photostream) and affected albums
      if (nickname) {
        await revalidateProfile(nickname);
        if (data.affectedAlbums.length > 0) {
          await Promise.all(data.affectedAlbums.map((slug) => revalidateAlbum(nickname, slug)));
        }
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
    { photoIds: string[]; data: BulkPhotoFormData; previousPhotos: PhotoWithAlbums[] | undefined; affectedAlbums: string[] },
    Error,
    { photoIds: string[]; data: BulkPhotoFormData },
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async ({ photoIds, data }: { photoIds: string[]; data: BulkPhotoFormData }) => {
      if (!userId) throw new Error('User not authenticated');

      // Optimistically update cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['photos', userId, filter]);

      // Pre-compute tag sets for optimistic update
      const desiredTagsForCache = data.tags !== undefined
        ? new Set(data.tags.map((t) => t.toLowerCase()))
        : null;
      const originalCommonTagsForCache = data.originalCommonTags
        ? new Set(data.originalCommonTags.map((t) => t.toLowerCase()))
        : new Set<string>();
      const explicitlyRemovedTagsForCache = desiredTagsForCache
        ? new Set([...originalCommonTagsForCache].filter((tag) => !desiredTagsForCache.has(tag)))
        : new Set<string>();

      queryClient.setQueryData<PhotoWithAlbums[]>(['photos', userId, filter], (old) => {
        if (!old) return old;
        return old.map((p) => {
          if (!photoIds.includes(p.id)) return p;

          // For tags, we need to preserve partial tags (not in originalCommonTags)
          // and only apply changes to common tags
          let newTags = p.tags;
          if (desiredTagsForCache !== null) {
            const existingTags = p.tags?.map((t) => t.tag.toLowerCase()) || [];
            // Keep tags that are: (1) in desired set, OR (2) not explicitly removed (partial tags)
            const keptTags = existingTags.filter(
              (tag) => desiredTagsForCache.has(tag) || !explicitlyRemovedTagsForCache.has(tag),
            );
            // Add new tags from desired set that don't exist yet
            const tagsToAdd = [...desiredTagsForCache].filter((tag) => !existingTags.includes(tag));
            newTags = [...new Set([...keptTags, ...tagsToAdd])].map((tag) => ({ tag }));
          }

          return {
            ...p,
            ...(data.title && { title: data.title }),
            ...(data.description && { description: data.description }),
            ...(data.is_public !== null && { is_public: data.is_public }),
            ...(desiredTagsForCache !== null && { tags: newTags }),
          };
        });
      });

      const updates = photoIds.map((id) => ({
        id,
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.is_public !== null && { is_public: data.is_public }),
      }));

      const { error } = await supabase.rpc('batch_update_photos', {
        photo_updates: updates,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update photos');
      }

      // Sync tags: add missing tags and remove only tags that were explicitly removed
      if (data.tags !== undefined) {
        const desiredTags = new Set(data.tags.map((t) => t.toLowerCase()));
        // Original common tags - only these were in the form, so only these can be "removed"
        const originalCommonTags = new Set(
          (data.originalCommonTags || []).map((t) => t.toLowerCase()),
        );
        // Tags that user explicitly removed = originalCommonTags - desiredTags
        const explicitlyRemovedTags = new Set(
          [...originalCommonTags].filter((tag) => !desiredTags.has(tag)),
        );

        // Fetch existing tags for these photos
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

        // Determine which tags to add and which to remove
        const tagInserts: { photo_id: string; tag: string }[] = [];
        const tagDeletes: { photo_id: string; tag: string }[] = [];

        photoIds.forEach((photoId) => {
          const existing = tagsByPhoto.get(photoId) || new Set();

          // Add tags that are in desired list but not in existing
          desiredTags.forEach((tag) => {
            if (!existing.has(tag) && existing.size + tagInserts.filter((t) => t.photo_id === photoId).length < 5) {
              tagInserts.push({ photo_id: photoId, tag });
            }
          });

          // Remove only tags that were explicitly removed by the user
          // (i.e., were in originalCommonTags but no longer in desiredTags)
          // This preserves partial tags that the user never had control over
          existing.forEach((tag) => {
            if (explicitlyRemovedTags.has(tag)) {
              tagDeletes.push({ photo_id: photoId, tag });
            }
          });
        });

        // Delete tags that need to be removed
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

        // Add tags that need to be added
        if (tagInserts.length > 0) {
          const { error: tagError } = await supabase.from('photo_tags').insert(tagInserts);
          if (tagError) {
            throw new Error(tagError.message || 'Failed to add tags');
          }
        }

        // Invalidate global tags cache
        queryClient.invalidateQueries({ queryKey: ['global-tags'] });
      }

      // Get affected albums for revalidation and cache invalidation
      const affectedAlbums = new Set<string>();
      const affectedAlbumIds = new Set<string>();
      previousPhotos?.forEach((p) => {
        if (photoIds.includes(p.id)) {
          p.albums?.forEach((a) => {
            affectedAlbums.add(a.slug);
            affectedAlbumIds.add(a.id);
          });
        }
      });

      // Invalidate album photos caches to ensure tags show up when viewing photos in albums
      affectedAlbumIds.forEach((albumId) => {
        queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });
      });

      return { photoIds, data, previousPhotos, affectedAlbums: Array.from(affectedAlbums) };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (userId && context?.previousPhotos) {
        queryClient.setQueryData(['photos', userId, filter], context.previousPhotos);
      }
    },
    onSuccess: async (data) => {
      // Revalidate profile (photostream) and affected albums
      if (nickname) {
        await revalidateProfile(nickname);
        if (data.affectedAlbums.length > 0) {
          await Promise.all(data.affectedAlbums.map((slug) => revalidateAlbum(nickname, slug)));
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
    { photos: PhotoWithAlbums[]; previousPhotos: PhotoWithAlbums[] | undefined },
    Error,
    PhotoWithAlbums[],
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async (photos: PhotoWithAlbums[]) => {
      if (!userId) throw new Error('User not authenticated');

      // Optimistically update cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['photos', userId, filter]);
      queryClient.setQueryData<PhotoWithAlbums[]>(['photos', userId, filter], photos);

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

      return { photos, previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (userId && context?.previousPhotos) {
        queryClient.setQueryData(['photos', userId, filter], context.previousPhotos);
      }
    },
    onSuccess: async () => {
      // Invalidate photos cache to ensure fresh data
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['photos', userId, filter] });
      }
      // Revalidate profile page (photostream order changed)
      if (nickname) {
        await revalidateProfile(nickname);
      }
    },
  });
}
