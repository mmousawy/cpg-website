import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import { revalidateAlbum, revalidateAlbums } from '@/app/actions/revalidate';
import type { AlbumWithPhotos } from '@/types/albums';
import type { AlbumFormData, BulkAlbumFormData } from '@/components/manage';

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
          tags: data.tags?.map((tag) => ({ tag: tag.toLowerCase() })) || [],
        } as AlbumWithPhotos;
        return old ? [newAlbumWithPhotos, ...old] : [newAlbumWithPhotos];
      });

      // Invalidate counts
      queryClient.invalidateQueries({ queryKey: ['counts', userId] });

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
      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId], (old) => {
        if (!old) return old;
        return old.map((a) =>
          albumIds.includes(a.id)
            ? {
                ...a,
                ...(data.isPublic !== null && { is_public: data.isPublic }),
              }
            : a,
        );
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

      // Add tags if provided
      if (data.tags && data.tags.length > 0) {
        const { data: existingTags } = await supabase
          .from('album_tags')
          .select('album_id, tag')
          .in('album_id', albumIds);

        const tagsByAlbum = new Map<string, Set<string>>();
        existingTags?.forEach(({ album_id, tag }) => {
          if (!tagsByAlbum.has(album_id)) {
            tagsByAlbum.set(album_id, new Set());
          }
          tagsByAlbum.get(album_id)!.add(tag);
        });

        const tagInserts: { album_id: string; tag: string }[] = [];
        albumIds.forEach((albumId) => {
          const existing = tagsByAlbum.get(albumId) || new Set();
          data.tags!.forEach((tag) => {
            const currentInserts = tagInserts.filter((t) => t.album_id === albumId).length;
            if (!existing.has(tag) && existing.size + currentInserts < 5) {
              tagInserts.push({ album_id: albumId, tag: tag.toLowerCase() });
            }
          });
        });

        if (tagInserts.length > 0) {
          const { error: tagError } = await supabase.from('album_tags').insert(tagInserts);
          if (tagError) {
            throw new Error(tagError.message || 'Failed to add tags');
          }
        }
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
