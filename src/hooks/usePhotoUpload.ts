'use client';

import type { Photo } from '@/types/photos';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useState } from 'react';

export interface UploadingPhoto {
  id: string; // Temporary ID for tracking
  file: File;
  previewUrl: string; // Object URL for local preview
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  photo?: Photo; // The actual photo record once complete
}

export interface UploadPhotoOptions {
  albumIds?: string[];
  isPublic?: boolean;
  bucketName?: string;
  pathPrefix?: string;
  sortOrderStart?: number;
}

interface UsePhotoUploadReturn {
  uploadingPhotos: UploadingPhoto[];
  uploadFiles: (files: File[], userId: string, supabase: SupabaseClient, options?: UploadPhotoOptions) => Promise<Photo[]>;
  clearCompleted: () => void;
  clearAll: () => void;
  dismissUpload: (id: string) => void;
}

/**
 * Hook for uploading photos with progress tracking and previews
 */
export function usePhotoUpload(): UsePhotoUploadReturn {
  const [uploadingPhotos, setUploadingPhotos] = useState<UploadingPhoto[]>([]);

  const updateUploadingPhoto = useCallback((id: string, updates: Partial<UploadingPhoto>) => {
    setUploadingPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  }, []);

  const uploadFiles = useCallback(
    async (
      files: File[],
      userId: string,
      supabase: SupabaseClient,
      options: UploadPhotoOptions = {},
    ): Promise<Photo[]> => {
      const {
        albumIds = [],
        isPublic = false,
        bucketName = 'user-photos',
        pathPrefix,
        sortOrderStart = 0,
      } = options;

      // Create initial upload entries with previews
      const newUploads: UploadingPhoto[] = files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'pending' as const,
      }));

      setUploadingPhotos((prev) => [...prev, ...newUploads]);

      const results: Photo[] = [];

      // Check if albums have covers (for setting first photo as manual cover)
      const albumCoverChecks: Record<string, boolean> = {};
      if (albumIds.length > 0) {
        const { data: albumsData } = await supabase
          .from('albums')
          .select('id, cover_image_url')
          .in('id', albumIds)
          .eq('user_id', userId);
        
        if (albumsData) {
          albumsData.forEach((album) => {
            albumCoverChecks[album.id] = album.cover_image_url !== null;
          });
        }
      }

      // Upload files sequentially to maintain order and show progress clearly
      for (let i = 0; i < newUploads.length; i++) {
        const upload = newUploads[i];
        const file = upload.file;

        try {
          // Update status to uploading
          updateUploadingPhoto(upload.id, { status: 'uploading', progress: 0 });

          // Validate file
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (!allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type: ${file.name}`);
          }
          if (file.size > 10 * 1024 * 1024) {
            throw new Error(`File too large: ${file.name}`);
          }

          // Generate path
          const prefix = pathPrefix ?? `${userId}/`;
          const fileExt = file.name.split('.').pop();
          const randomId = crypto.randomUUID();
          const fileName = `${randomId}.${fileExt}`;
          const filePath = `${prefix}${fileName}`;

          // Upload with progress tracking using XHR
          const { publicUrl } = await uploadWithProgress(
            supabase,
            bucketName,
            filePath,
            file,
            (progress) => {
              updateUploadingPhoto(upload.id, { progress });
            },
          );

          // Update status to processing (creating DB record)
          updateUploadingPhoto(upload.id, { status: 'processing', progress: 100 });

          // Get image dimensions
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new window.Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = upload.previewUrl;
          });

          // Import utilities dynamically to avoid SSR issues
          const [{ default: exifr }, { generateBlurhash }, { customAlphabet }] = await Promise.all([
            import('exifr'),
            import('@/utils/generateBlurhash'),
            import('nanoid'),
          ]);

          // Extract EXIF
          let exifData = null;
          try {
            exifData = await exifr.parse(file, {
              pick: ['Make', 'Model', 'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'LensModel', 'GPSLatitude', 'GPSLongitude'],
            });
          } catch { /* ignore */ }

          // Generate blurhash
          const blurhash = await generateBlurhash(file);

          // Generate short_id
          const nanoid = customAlphabet('bcdfghjklmnpqrstvwxyz0123456789', 5);
          const shortId = nanoid();

          // Insert into database
          const { data: photoData, error: insertError } = await supabase
            .from('photos')
            .insert({
              storage_path: filePath,
              url: publicUrl,
              width: img.width,
              height: img.height,
              file_size: file.size,
              mime_type: file.type,
              exif_data: exifData,
              user_id: userId,
              title: null,
              description: null,
              is_public: isPublic,
              blurhash,
              short_id: shortId,
              original_filename: file.name,
              sort_order: sortOrderStart + i,
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to save photo: ${insertError.message}`);
          }

          // Add to albums if specified
          if (albumIds.length > 0 && photoData) {
            const albumPhotoInserts = albumIds.map((albumId) => ({
              album_id: albumId,
              photo_id: photoData.id,
              photo_url: publicUrl,
              width: img.width,
              height: img.height,
              sort_order: sortOrderStart + i,
            }));

            await supabase.from('album_photos').insert(albumPhotoInserts);

            // Set first photo as manual cover for albums that don't have a cover yet
            if (i === 0) {
              const albumsWithoutCover = albumIds.filter((albumId) => !albumCoverChecks[albumId]);
              if (albumsWithoutCover.length > 0) {
                await supabase
                  .from('albums')
                  .update({
                    cover_image_url: publicUrl,
                    cover_is_manual: true,
                  })
                  .in('id', albumsWithoutCover)
                  .eq('user_id', userId);
              }
            }
          }

          // Mark as complete
          updateUploadingPhoto(upload.id, {
            status: 'complete',
            photo: photoData as Photo,
          });

          results.push(photoData as Photo);

          // Revalidate cache for members page (recently active)
          // Note: This is called per photo, but revalidation is idempotent
          if (photoData.is_public) {
            const { revalidateProfiles, revalidateGalleryData } = await import('@/app/actions/revalidate');
            await Promise.all([
              revalidateProfiles(),
              revalidateGalleryData(),
            ]);
          }
        } catch (err: any) {
          console.error('Upload error:', err);
          updateUploadingPhoto(upload.id, {
            status: 'error',
            error: err.message || 'Upload failed',
          });
        }
      }

      return results;
    },
    [updateUploadingPhoto],
  );

  const clearCompleted = useCallback(() => {
    setUploadingPhotos((prev) => {
      // Revoke object URLs for completed uploads
      prev
        .filter((p) => p.status === 'complete')
        .forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return prev.filter((p) => p.status !== 'complete');
    });
  }, []);

  const clearAll = useCallback(() => {
    setUploadingPhotos((prev) => {
      // Revoke all object URLs
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }, []);

  const dismissUpload = useCallback((id: string) => {
    setUploadingPhotos((prev) => {
      const upload = prev.find((p) => p.id === id);
      if (upload) {
        URL.revokeObjectURL(upload.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  return {
    uploadingPhotos,
    uploadFiles,
    clearCompleted,
    clearAll,
    dismissUpload,
  };
}

/**
 * Upload file with progress tracking using XMLHttpRequest
 */
async function uploadWithProgress(
  supabase: SupabaseClient,
  bucketName: string,
  filePath: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<{ publicUrl: string }> {
  // Get the storage URL and auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Construct the upload URL
  // @ts-expect-error - accessing protected property for URL
  const supabaseUrl = supabase.supabaseUrl || supabase.storageUrl?.replace('/storage/v1', '');
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        resolve({ publicUrl });
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(file);
  });
}
