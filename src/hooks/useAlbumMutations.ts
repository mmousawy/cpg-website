import { revalidateAlbum, revalidateAlbums } from '@/app/actions/revalidate';
import type { AlbumFormData, BulkAlbumFormData } from '@/components/manage';
import type { SharedAlbumFormData } from '@/components/manage/SharedAlbumEditForm';
import type { AlbumWithPhotos } from '@/types/albums';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function isSharedAlbumFormData(data: AlbumFormData | SharedAlbumFormData): data is SharedAlbumFormData {
  return 'joinPolicy' in data;
}

export function useCreateAlbum(userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AlbumFormData | SharedAlbumFormData) => {
      if (!userId) throw new Error('User not authenticated');

      const isShared = isSharedAlbumFormData(data);

      const insertPayload = {
        user_id: userId,
        title: data.title.trim(),
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        is_public: data.isPublic,
        ...(isShared && {
          is_shared: true,
          join_policy: data.joinPolicy,
          max_photos_per_user: data.maxPhotosPerUser ?? null,
        }),
      };

      const { data: newAlbum, error: createError } = await supabase
        .from('albums')
        .insert(insertPayload)
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message || 'Failed to create album');
      }

      if (data.tags && data.tags.length > 0 && newAlbum) {
        await supabase
          .from('album_tags')
          .insert(data.tags.map((tag) => ({ album_id: newAlbum.id, tag: tag.toLowerCase() })));
      }

      const cacheFilter = isShared ? 'shared' : 'personal';
      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId, cacheFilter], (old) => {
        const newAlbumWithPhotos: AlbumWithPhotos = {
          ...newAlbum,
          photos: [],
          tags: undefined,
        };
        return old ? [newAlbumWithPhotos, ...old] : [newAlbumWithPhotos];
      });

      queryClient.invalidateQueries({ queryKey: ['counts', userId] });
      queryClient.invalidateQueries({ queryKey: ['album-section-counts', userId] });

      if (nickname && data.isPublic && newAlbum) {
        await revalidateAlbum(nickname, newAlbum.slug);
      }

      return newAlbum;
    },
  });
}

export function useUpdateAlbum(userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    {
      albumId: string;
      data: AlbumFormData | SharedAlbumFormData;
      previousAlbums?: AlbumWithPhotos[] | undefined;
    },
    Error,
    { albumId: string; data: AlbumFormData | SharedAlbumFormData },
    { previousAlbums: AlbumWithPhotos[] | undefined }
  >({
    mutationFn: async ({
      albumId,
      data,
    }: {
      albumId: string;
      data: AlbumFormData | SharedAlbumFormData;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      const isShared = isSharedAlbumFormData(data);

      const updatePayload: Record<string, unknown> = {
        title: data.title.trim(),
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        is_public: data.isPublic,
        is_shared: isShared,
        join_policy: isShared ? data.joinPolicy : null,
        max_photos_per_user: isShared ? (data.maxPhotosPerUser ?? null) : null,
      };

      // Optimistically update all album sub-caches
      for (const filter of ['personal', 'shared', 'event'] as const) {
        queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId, filter], (old) => {
          if (!old) return old;
          return old.map((a) =>
            a.id === albumId
              ? { ...a, ...updatePayload }
              : a,
          );
        });
      }

      const { error: updateError } = await supabase
        .from('albums')
        .update(updatePayload)
        .eq('id', albumId)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update album');
      }

      if (isShared) {
        const { error: ownerError } = await supabase.rpc('add_shared_album_owner', {
          p_album_id: albumId,
        });
        if (ownerError) {
          throw new Error(ownerError.message || 'Failed to add album owner as member');
        }
      }

      await supabase.from('album_tags').delete().eq('album_id', albumId);
      if (data.tags && data.tags.length > 0) {
        await supabase.from('album_tags').insert(
          data.tags.map((tag) => ({ album_id: albumId, tag: tag.toLowerCase() })),
        );
      }

      for (const filter of ['personal', 'shared', 'event'] as const) {
        queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId, filter], (old) => {
          if (!old) return old;
          return old.map((a) =>
            a.id === albumId
              ? {
                ...a,
                tags: data.tags?.map((tag) => ({ tag: tag.toLowerCase() })) ?? [],
              } as AlbumWithPhotos
              : a,
          );
        });
      }

      if (nickname) {
        await revalidateAlbum(nickname, data.slug);
      }

      return { albumId, data };
    },
    onError: () => {
      // Rollback on error — invalidate all album queries to refetch
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });
      }
    },
    onSuccess: (result) => {
      // Invalidate albums cache to ensure fresh data after server revalidation
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });
        queryClient.invalidateQueries({ queryKey: ['album-section-counts', userId] });
        if (result?.data?.slug) {
          queryClient.invalidateQueries({ queryKey: ['album', userId, result.data.slug] });
        }
      }
    },
  });
}

export function useBulkUpdateAlbums(userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { albumIds: string[]; data: BulkAlbumFormData; previousAlbums?: AlbumWithPhotos[] | undefined },
    Error,
    { albumIds: string[]; data: BulkAlbumFormData },
    { previousAlbums: AlbumWithPhotos[] | undefined }
  >({
    mutationFn: async ({ albumIds, data }: { albumIds: string[]; data: BulkAlbumFormData }) => {
      if (!userId) throw new Error('User not authenticated');

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

      // Optimistically update all album sub-caches
      const optimisticUpdate = (old: AlbumWithPhotos[] | undefined) => {
        if (!old) return old;
        return old.map((a) => {
          if (!albumIds.includes(a.id)) return a;

          let newTags = a.tags;
          if (desiredTagsForCache !== null) {
            const existingTags = a.tags?.map((t) => (typeof t === 'string' ? t : t.tag).toLowerCase()) || [];
            const keptTags = existingTags.filter(
              (tag) => desiredTagsForCache.has(tag) || !explicitlyRemovedTagsForCache.has(tag),
            );
            const tagsToAdd = [...desiredTagsForCache].filter((tag) => !existingTags.includes(tag));
            newTags = [...new Set([...keptTags, ...tagsToAdd])].map((tag) => ({
              id: '', album_id: a.id, tag, created_at: null,
            }));
          }

          return {
            ...a,
            ...(data.isPublic !== null && { is_public: data.isPublic }),
            ...(desiredTagsForCache !== null && { tags: newTags }),
          };
        });
      };

      for (const filter of ['personal', 'shared', 'event'] as const) {
        queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId, filter], optimisticUpdate);
      }

      const updates: { is_public?: boolean } = {};
      if (data.isPublic !== null) {
        updates.is_public = data.isPublic;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('albums')
          .update(updates)
          .in('id', albumIds)
          .eq('user_id', userId)
          .is('deleted_at', null);

        if (updateError) {
          throw new Error(updateError.message || 'Failed to update albums');
        }
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

        // Fetch existing tags for these albums
        const { data: existingTags } = await supabase
          .from('album_tags')
          .select('album_id, tag')
          .in('album_id', albumIds);

        const tagsByAlbum = new Map<string, Set<string>>();
        existingTags?.forEach(({ album_id, tag }) => {
          if (!tagsByAlbum.has(album_id)) {
            tagsByAlbum.set(album_id, new Set());
          }
          tagsByAlbum.get(album_id)!.add(tag.toLowerCase());
        });

        // Determine which tags to add and which to remove
        const tagInserts: { album_id: string; tag: string }[] = [];
        const tagDeletes: { album_id: string; tag: string }[] = [];

        albumIds.forEach((albumId) => {
          const existing = tagsByAlbum.get(albumId) || new Set();

          // Add tags that are in desired list but not in existing
          desiredTags.forEach((tag) => {
            if (!existing.has(tag) && existing.size + tagInserts.filter((t) => t.album_id === albumId).length < 5) {
              tagInserts.push({ album_id: albumId, tag });
            }
          });

          // Remove only tags that were explicitly removed by the user
          // (i.e., were in originalCommonTags but no longer in desiredTags)
          // This preserves partial tags that the user never had control over
          existing.forEach((tag) => {
            if (explicitlyRemovedTags.has(tag)) {
              tagDeletes.push({ album_id: albumId, tag });
            }
          });
        });

        // Delete tags that need to be removed
        if (tagDeletes.length > 0) {
          for (const { album_id, tag } of tagDeletes) {
            const { error: deleteError } = await supabase
              .from('album_tags')
              .delete()
              .eq('album_id', album_id)
              .eq('tag', tag);
            if (deleteError) {
              throw new Error(deleteError.message || 'Failed to remove tags');
            }
          }
        }

        // Add tags that need to be added
        if (tagInserts.length > 0) {
          const { error: tagError } = await supabase.from('album_tags').insert(tagInserts);
          if (tagError) {
            throw new Error(tagError.message || 'Failed to add tags');
          }
        }

        // Invalidate global tags cache
        queryClient.invalidateQueries({ queryKey: ['global-tags'] });
      }

      // Revalidate album pages (batch operation for efficiency)
      if (nickname) {
        const allCached: AlbumWithPhotos[] = [];
        for (const filter of ['personal', 'shared', 'event'] as const) {
          const cached = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId, filter]);
          if (cached) allCached.push(...cached);
        }
        const albumsToRevalidate = allCached.filter((a) => albumIds.includes(a.id));
        if (albumsToRevalidate.length > 0) {
          const albumSlugs = albumsToRevalidate.map((album) => album.slug);
          await revalidateAlbums(nickname, albumSlugs);
        }
      }

      return { albumIds, data };
    },
    onError: () => {
      // Rollback on error — invalidate all album queries to refetch
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });
      }
    },
    onSuccess: () => {
      // Invalidate albums cache to ensure fresh data after server revalidation
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });
        queryClient.invalidateQueries({ queryKey: ['album-section-counts', userId] });
      }
    },
  });
}

export function useDeleteAlbums(userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { albumIds: string[]; previousAlbums: AlbumWithPhotos[] | undefined },
    Error,
    string[],
    { previousAlbums: AlbumWithPhotos[] | undefined }
  >({
    mutationFn: async (albumIds: string[]) => {
      if (!userId) throw new Error('User not authenticated');

      // Get album slugs before deletion from all cached album sub-queries
      const albumIdSet = new Set(albumIds);
      const allCached: AlbumWithPhotos[] = [];
      for (const filter of ['personal', 'shared', 'event'] as const) {
        const cached = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId, filter]);
        if (cached) allCached.push(...cached);
      }
      const albumsToDelete = allCached.filter((a) => albumIdSet.has(a.id));

      // Optimistically remove from all cached sub-queries
      const previousCaches: Record<string, AlbumWithPhotos[] | undefined> = {};
      for (const filter of ['personal', 'shared', 'event'] as const) {
        const key = ['albums', userId, filter];
        previousCaches[filter] = queryClient.getQueryData<AlbumWithPhotos[]>(key);
        queryClient.setQueryData<AlbumWithPhotos[]>(key, (old) => {
          if (!old) return old;
          return old.filter((a) => !albumIdSet.has(a.id));
        });
      }

      // Delete albums one by one using the RPC function
      for (const albumId of albumIds) {
        const { data: success, error } = await supabase.rpc('delete_album', {
          p_album_id: albumId,
        });

        if (error || !success) {
          throw new Error(error?.message || `Failed to delete album ${albumId}`);
        }
      }

      // Revalidate album pages (batch operation for efficiency)
      if (nickname && albumsToDelete.length > 0) {
        const albumSlugs = albumsToDelete.map((album) => album.slug);
        await revalidateAlbums(nickname, albumSlugs);
      }

      // Invalidate counts
      queryClient.invalidateQueries({ queryKey: ['counts', userId] });
      queryClient.invalidateQueries({ queryKey: ['album-section-counts', userId] });

      return { albumIds, previousAlbums: allCached };
    },
    onError: (err, variables, context) => {
      // Rollback on error — invalidate all album queries to refetch
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });
      }
    },
  });
}
