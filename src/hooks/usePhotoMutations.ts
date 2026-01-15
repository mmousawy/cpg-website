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

      // Get affected albums for revalidation
      const photo = previousPhotos?.find((p) => p.id === photoId);
      const affectedAlbums = photo?.albums?.map((a) => a.slug) || [];

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
      queryClient.setQueryData<PhotoWithAlbums[]>(['photos', userId, filter], (old) => {
        if (!old) return old;
        return old.map((p) =>
          photoIds.includes(p.id)
            ? {
              ...p,
              ...(data.title && { title: data.title }),
              ...(data.description && { description: data.description }),
              ...(data.is_public !== null && { is_public: data.is_public }),
            }
            : p,
        );
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

      // Get affected albums for revalidation
      const affectedAlbums = new Set<string>();
      previousPhotos?.forEach((p) => {
        if (photoIds.includes(p.id)) {
          p.albums?.forEach((a) => affectedAlbums.add(a.slug));
        }
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
      // Revalidate profile page (photostream order changed)
      if (nickname) {
        await revalidateProfile(nickname);
      }
    },
  });
}
