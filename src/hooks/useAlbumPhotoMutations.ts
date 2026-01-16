import { revalidateAlbum } from '@/app/actions/revalidate';
import type { BulkPhotoFormData, PhotoFormData } from '@/components/manage';
import type { AlbumWithPhotos } from '@/types/albums';
import type { PhotoWithAlbums } from '@/types/photos';
import { supabase } from '@/utils/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useRemoveFromAlbum(albumId: string | undefined, userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { albumPhotoIds: string[]; previousPhotos: PhotoWithAlbums[] | undefined },
    Error,
    string[],
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async (albumPhotoIds: string[]) => {
      if (!albumId) throw new Error('Album ID required');

      // Optimistically remove from cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['album-photos', albumId]);
      queryClient.setQueryData<PhotoWithAlbums[]>(['album-photos', albumId], (old) => {
        if (!old) return old;
        return old.filter((p) => !albumPhotoIds.includes(p.album_photo_id || ''));
      });

      const { error } = await supabase.rpc('bulk_remove_from_album', {
        p_album_photo_ids: albumPhotoIds,
      });

      if (error) {
        throw new Error(error.message || 'Failed to remove photos from album');
      }

      // Invalidate album-photos query to refetch
      queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });

      if (userId) {
        // Invalidate albums query to update album cards (photo counts)
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });

        // Invalidate photos query to update which albums photos belong to
        queryClient.invalidateQueries({ queryKey: ['photos', userId] });

        // Invalidate counts query to update photo/album counts
        queryClient.invalidateQueries({ queryKey: ['counts', userId] });
      }

      // Revalidate album page
      if (nickname && userId) {
        const album = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId])?.find((a) => a.id === albumId);
        if (album?.slug) {
          await revalidateAlbum(nickname, album.slug);
        }
      }

      return { albumPhotoIds, previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (albumId && context?.previousPhotos) {
        queryClient.setQueryData(['album-photos', albumId], context.previousPhotos);
      }
    },
  });
}

export function useReorderAlbumPhotos(albumId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { photos: PhotoWithAlbums[]; previousPhotos: PhotoWithAlbums[] | undefined },
    Error,
    PhotoWithAlbums[],
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async (photos: PhotoWithAlbums[]) => {
      if (!albumId) throw new Error('Album ID required');

      // Optimistically update cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['album-photos', albumId]);
      queryClient.setQueryData<PhotoWithAlbums[]>(['album-photos', albumId], photos);

      const updates = photos
        .filter((photo) => photo.album_photo_id)
        .map((photo, index) => ({
          id: photo.album_photo_id!,
          sort_order: index,
        }));

      if (updates.length > 0) {
        await supabase.rpc('batch_update_album_photos', { photo_updates: updates });

        // Revalidate album page
        if (nickname) {
          const album = queryClient.getQueryData<any>(['albums'])?.find((a: any) => a.id === albumId);
          if (album?.slug) {
            await revalidateAlbum(nickname, album.slug);
          }
        }
      }

      return { photos, previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (albumId && context?.previousPhotos) {
        queryClient.setQueryData(['album-photos', albumId], context.previousPhotos);
      }
    },
  });
}

export function useUpdateAlbumPhoto(albumId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { photoId: string; data: PhotoFormData; previousPhotos: PhotoWithAlbums[] | undefined },
    Error,
    { photoId: string; data: PhotoFormData },
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async ({ photoId, data }: { photoId: string; data: PhotoFormData }) => {
      if (!albumId) throw new Error('Album ID required');

      // Optimistically update cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['album-photos', albumId]);
      queryClient.setQueryData<PhotoWithAlbums[]>(['album-photos', albumId], (old) => {
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

      // Update album_photos title if it exists
      const photo = previousPhotos?.find((p) => p.id === photoId);
      if (photo?.album_photo_id) {
        await supabase.from('album_photos').update({ title: data.title }).eq('id', photo.album_photo_id);
      }

      // Update photos table
      const { error } = await supabase
        .from('photos')
        .update({
          title: data.title,
          description: data.description,
          is_public: data.is_public,
        })
        .eq('id', photoId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message || 'Failed to update photo');
      }

      // Update tags - delete existing and insert new ones
      await supabase.from('photo_tags').delete().eq('photo_id', photoId);
      if (data.tags && data.tags.length > 0) {
        await supabase.from('photo_tags').insert(
          data.tags.map((tag) => ({ photo_id: photoId, tag: tag.toLowerCase() })),
        );
      }

      // Invalidate global tags cache
      queryClient.invalidateQueries({ queryKey: ['global-tags'] });

      // Invalidate main photos queries to ensure tags show up when navigating to photos page
      const userId = previousPhotos?.find((p) => p.id === photoId)?.user_id ||
        queryClient.getQueryData<any>(['albums'])?.find((a: any) => a.id === albumId)?.user_id;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['photos', userId] });
      }

      // Revalidate album page
      if (nickname) {
        const album = queryClient.getQueryData<any>(['albums'])?.find((a: any) => a.id === albumId);
        if (album?.slug) {
          await revalidateAlbum(nickname, album.slug);
        }
      }

      return { photoId, data, previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (albumId && context?.previousPhotos) {
        queryClient.setQueryData(['album-photos', albumId], context.previousPhotos);
      }
    },
  });
}

export function useDeleteAlbumPhoto(albumId: string | undefined, userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { albumPhotoId: string; previousPhotos: PhotoWithAlbums[] | undefined },
    Error,
    string,
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async (albumPhotoId: string) => {
      if (!albumId) throw new Error('Album ID required');

      // Optimistically remove from cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['album-photos', albumId]);
      queryClient.setQueryData<PhotoWithAlbums[]>(['album-photos', albumId], (old) => {
        if (!old) return old;
        return old.filter((p) => p.album_photo_id !== albumPhotoId);
      });

      await supabase.from('album_photos').delete().eq('id', albumPhotoId);

      // Invalidate album-photos query to refetch
      queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });

      if (userId) {
        // Invalidate albums query to update album cards (photo counts)
        queryClient.invalidateQueries({ queryKey: ['albums', userId] });

        // Invalidate photos query to update which albums photos belong to
        queryClient.invalidateQueries({ queryKey: ['photos', userId] });

        // Invalidate counts query to update photo/album counts
        queryClient.invalidateQueries({ queryKey: ['counts', userId] });
      }

      // Revalidate album page
      if (nickname && userId) {
        const album = queryClient.getQueryData<AlbumWithPhotos[]>(['albums', userId])?.find((a) => a.id === albumId);
        if (album?.slug) {
          await revalidateAlbum(nickname, album.slug);
        }
      }

      return { albumPhotoId, previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (albumId && context?.previousPhotos) {
        queryClient.setQueryData(['album-photos', albumId], context.previousPhotos);
      }
    },
  });
}

export function useBulkUpdateAlbumPhotos(albumId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { photoIds: string[]; data: BulkPhotoFormData; previousPhotos: PhotoWithAlbums[] | undefined },
    Error,
    { photoIds: string[]; data: BulkPhotoFormData },
    { previousPhotos: PhotoWithAlbums[] | undefined }
  >({
    mutationFn: async ({ photoIds, data }: { photoIds: string[]; data: BulkPhotoFormData }) => {
      if (!albumId) throw new Error('Album ID required');

      // Optimistically update cache
      const previousPhotos = queryClient.getQueryData<PhotoWithAlbums[]>(['album-photos', albumId]);
      queryClient.setQueryData<PhotoWithAlbums[]>(['album-photos', albumId], (old) => {
        if (!old) return old;
        return old.map((p) =>
          photoIds.includes(p.id)
            ? {
                ...p,
                ...(data.title !== null && { title: data.title }),
                ...(data.description !== null && { description: data.description }),
                ...(data.is_public !== null && { is_public: data.is_public }),
                ...(data.tags !== undefined && {
                  tags: data.tags.map((tag) => ({ tag: tag.toLowerCase() })),
                }),
              }
            : p,
        );
      });

      // Update album_photos titles if provided
      if (data.title !== null) {
        const albumPhotoIds = previousPhotos
          ?.filter((p) => photoIds.includes(p.id))
          .map((p) => p.album_photo_id)
          .filter((id): id is string => !!id) || [];

        if (albumPhotoIds.length > 0) {
          await supabase.from('album_photos').update({ title: data.title }).in('id', albumPhotoIds);
        }
      }

      // Update photos table
      const updates = photoIds.map((id) => ({
        id,
        ...(data.title !== null && { title: data.title }),
        ...(data.description !== null && { description: data.description }),
        ...(data.is_public !== null && { is_public: data.is_public }),
      }));

      if (updates.length > 0) {
        const { error } = await supabase.rpc('batch_update_photos', {
          photo_updates: updates,
        });

        if (error) {
          throw new Error(error.message || 'Failed to update photos');
        }
      }

      // Sync tags: add missing tags and remove tags not in the form
      if (data.tags !== undefined) {
        const desiredTags = new Set(data.tags.map((t) => t.toLowerCase()));

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

          // Remove tags that are in existing but not in desired list
          existing.forEach((tag) => {
            if (!desiredTags.has(tag)) {
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

      // Invalidate main photos queries to ensure tags show up when navigating to photos page
      const userId = previousPhotos?.[0]?.user_id ||
        queryClient.getQueryData<any>(['albums'])?.find((a: any) => a.id === albumId)?.user_id;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['photos', userId] });
      }

      // Revalidate album page
      if (nickname) {
        const album = queryClient.getQueryData<any>(['albums'])?.find((a: any) => a.id === albumId);
        if (album?.slug) {
          await revalidateAlbum(nickname, album.slug);
        }
      }

      return { photoIds, data, previousPhotos };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (albumId && context?.previousPhotos) {
        queryClient.setQueryData(['album-photos', albumId], context.previousPhotos);
      }
    },
  });
}

export function useSetAlbumCover(userId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    { albumId: string; photoUrl: string },
    Error,
    { albumId: string; photoUrl: string }
  >({
    mutationFn: async ({ albumId, photoUrl }) => {
      if (!userId) throw new Error('User not authenticated');

      // Fetch album to get slug (needed for cache updates)
      const { data: albumData, error: fetchError } = await supabase
        .from('albums')
        .select('slug')
        .eq('id', albumId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch album');
      }

      const albumSlug = albumData?.slug;

      const { error } = await supabase
        .from('albums')
        .update({
          cover_image_url: photoUrl,
          cover_is_manual: true,
        })
        .eq('id', albumId)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message || 'Failed to set album cover');
      }

      // Update albums cache
      queryClient.setQueryData<AlbumWithPhotos[]>(['albums', userId], (old) => {
        if (!old) return old;
        return old.map((a) =>
          a.id === albumId
            ? { ...a, cover_image_url: photoUrl, cover_is_manual: true }
            : a,
        );
      });

      // Update album-by-slug cache (used by AlbumDetailClient)
      if (albumSlug) {
        queryClient.setQueryData<AlbumWithPhotos>(['album', userId, albumSlug], (old) => {
          if (!old) return old;
          return { ...old, cover_image_url: photoUrl, cover_is_manual: true };
        });
      }

      // Invalidate album photos cache so cover badges update
      queryClient.invalidateQueries({ queryKey: ['album-photos', albumId] });

      // Invalidate main photos cache so cover badges update on photos page
      queryClient.invalidateQueries({ queryKey: ['photos', userId] });

      // Revalidate album page
      if (nickname && albumSlug) {
        await revalidateAlbum(nickname, albumSlug);
      }

      return { albumId, photoUrl };
    },
  });
}
