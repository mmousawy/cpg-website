import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { revalidateAlbum } from '@/app/actions/revalidate';
import type { PhotoWithAlbums } from '@/types/photos';
import type { PhotoFormData } from '@/components/manage';

export function useRemoveFromAlbum(albumId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();
  const supabase = createClient();

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

      // Revalidate album page
      if (nickname) {
        const album = queryClient.getQueryData<any>(['albums'])?.find((a: any) => a.id === albumId);
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
  const supabase = createClient();

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
  const supabase = createClient();

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

export function useDeleteAlbumPhoto(albumId: string | undefined, nickname: string | null | undefined) {
  const queryClient = useQueryClient();
  const supabase = createClient();

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

      // Revalidate album page
      if (nickname) {
        const album = queryClient.getQueryData<any>(['albums'])?.find((a: any) => a.id === albumId);
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
