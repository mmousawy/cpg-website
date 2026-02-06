import { revalidateAlbum, revalidateAlbums } from '@/app/actions/revalidate';
import type { AlbumFormData, BulkAlbumFormData } from '@/components/manage';
import type { AlbumWithPhotos } from '@/types/albums';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateAlbum(userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AlbumFormData) => {
      if (!userId) throw new Error('User not authenticated');

      const { data: newAlbum, error: createError } = await supabase
        .from('albums')
        .insert({
          user_id: userId,
          title: data.title.trim(),
          slug: data.slug.trim(),
          description: data.description?.trim() || null,
          is_public: data.isPublic,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message || 'Failed to create album');
      }

      // Add tags for new album
      if (data.tags && data.tags.length > 0 && newAlbum) {
        await supabase
          .from('album_tags')
          .insert(data.tags.map((tag) => ({ album_id: newAlbum.id, tag: tag.toLowerCase() })));
      }

      // Optimistically add to cache
      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId], (old) => {
        const newAlbumWithPhotos: AlbumWithPhotos = {
          ...newAlbum,
          photos: [],
          tags: undefined, // Tags will be loaded when album is fetched
        };
        return old ? [newAlbumWithPhotos, ...old] : [newAlbumWithPhotos];
      });

      // Invalidate counts
      queryClient.invalidateQueries({ queryKey: ['counts', userId] });

      // Revalidate album pages if album is public
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
    { albumId: string; data: AlbumFormData; previousAlbums: AlbumWithPhotos[] | undefined },
    Error,
    { albumId: string; data: AlbumFormData },
    { previousAlbums: AlbumWithPhotos[] | undefined }
  >({
    mutationFn: async ({ albumId, data }: { albumId: string; data: AlbumFormData }) => {
      if (!userId) throw new Error('User not authenticated');

      // Optimistically update cache
      const previousAlbums = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId]);
      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId], (old) => {
        if (!old) return old;
        return old.map((a) =>
          a.id === albumId
            ? {
              ...a,
              title: data.title.trim(),
              slug: data.slug.trim(),
              description: data.description?.trim() || null,
              is_public: data.isPublic,
            }
            : a,
        );
      });

      const { error: updateError } = await supabase
        .from('albums')
        .update({
          title: data.title.trim(),
          slug: data.slug.trim(),
          description: data.description?.trim() || null,
          is_public: data.isPublic,
        })
        .eq('id', albumId)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update album');
      }

      // Update tags
      await supabase.from('album_tags').delete().eq('album_id', albumId);
      if (data.tags && data.tags.length > 0) {
        await supabase.from('album_tags').insert(
          data.tags.map((tag) => ({ album_id: albumId, tag: tag.toLowerCase() })),
        );
      }

      // Update tags in cache
      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId], (old) => {
        if (!old) return old;
        return old.map((a) =>
          a.id === albumId
            ? {
              ...a,
              tags: data.tags?.map((tag) => ({ tag: tag.toLowerCase() })) || [],
            } as AlbumWithPhotos
            : a,
        );
      });

      // Revalidate album pages
      if (nickname) {
        await revalidateAlbum(nickname, data.slug);
      }

      return { albumId, data, previousAlbums };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (userId && context?.previousAlbums) {
        queryClient.setQueryData(['albums', userId], context.previousAlbums);
      }
    },
    onSuccess: () => {
      // Invalidate albums cache to ensure fresh data after server revalidation
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });
      }
    },
  });
}

export function useBulkUpdateAlbums(userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { albumIds: string[]; data: BulkAlbumFormData; previousAlbums: AlbumWithPhotos[] | undefined },
    Error,
    { albumIds: string[]; data: BulkAlbumFormData },
    { previousAlbums: AlbumWithPhotos[] | undefined }
  >({
    mutationFn: async ({ albumIds, data }: { albumIds: string[]; data: BulkAlbumFormData }) => {
      if (!userId) throw new Error('User not authenticated');

      // Optimistically update cache
      const previousAlbums = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId]);

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

      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId], (old) => {
        if (!old) return old;
        return old.map((a) => {
          if (!albumIds.includes(a.id)) return a;

          // For tags, we need to preserve partial tags (not in originalCommonTags)
          // and only apply changes to common tags
          let newTags = a.tags;
          if (desiredTagsForCache !== null) {
            const existingTags = a.tags?.map((t) => (typeof t === 'string' ? t : t.tag).toLowerCase()) || [];
            // Keep tags that are: (1) in desired set, OR (2) not explicitly removed (partial tags)
            const keptTags = existingTags.filter(
              (tag) => desiredTagsForCache.has(tag) || !explicitlyRemovedTagsForCache.has(tag),
            );
            // Add new tags from desired set that don't exist yet
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
      });

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
        const albumsToRevalidate = previousAlbums?.filter((a) => albumIds.includes(a.id)) || [];
        if (albumsToRevalidate.length > 0) {
          const albumSlugs = albumsToRevalidate.map((album) => album.slug);
          await revalidateAlbums(nickname, albumSlugs);
        }
      }

      return { albumIds, data, previousAlbums };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (userId && context?.previousAlbums) {
        queryClient.setQueryData(['albums', userId], context.previousAlbums);
      }
    },
    onSuccess: () => {
      // Invalidate albums cache to ensure fresh data after server revalidation
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });
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

      // Get album slugs before deletion for revalidation
      const albumsToDelete = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId])?.filter((a) =>
        albumIds.includes(a.id),
      ) || [];

      // Optimistically remove from cache
      const previousAlbums = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId]);
      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId], (old) => {
        if (!old) return old;
        return old.filter((a) => !albumIds.includes(a.id));
      });

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

      return { albumIds, previousAlbums };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (userId && context?.previousAlbums) {
        queryClient.setQueryData(['albums', userId], context.previousAlbums);
      }
    },
  });
}
