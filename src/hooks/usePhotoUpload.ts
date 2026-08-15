'use client';

import type { Photo } from '@/types/photos';
import { validateImageFile, validateImageResolution } from '@/utils/imageValidation';
import { notifyFollowersOfUpload } from '@/utils/notifyFollowersOfUpload';
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
      const albumSlugs: string[] = [];
      const eventIds: number[] = [];
      if (albumIds.length > 0) {
        const { data: albumsData } = await supabase
          .from('albums')
          .select('id, slug, cover_image_url, event_id')
          .in('id', albumIds)
          .eq('user_id', userId);

        if (albumsData) {
          albumsData.forEach((album) => {
            albumCoverChecks[album.id] = album.cover_image_url !== null;
            if (album.slug) {
              albumSlugs.push(album.slug);
            }
            if (album.event_id != null) {
              eventIds.push(album.event_id);
            }
          });
        }
      }

      // Fetch user profile for default license and copyright (used for all uploads in this batch)
      let defaultLicense: 'all-rights-reserved' | 'cc-by-nc-nd-4.0' | 'cc-by-nc-4.0' | 'cc-by-4.0' | 'cc0' = 'all-rights-reserved';
      let copyrightNotice: string | null = null;
      let watermarkEnabled = false;
      let embedCopyrightExif = false;
      const { data: profileJson } = await supabase.rpc('get_own_profile');
      const profileData = (
        profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
          ? profileJson
          : null
      ) as {
        nickname?: string | null;
        default_license?: string | null;
        copyright_name?: string | null;
        full_name?: string | null;
        watermark_enabled?: boolean | null;
        embed_copyright_exif?: boolean | null;
      } | null;
      if (profileData) {
        defaultLicense = (profileData.default_license as typeof defaultLicense) || 'all-rights-reserved';
        watermarkEnabled = profileData.watermark_enabled ?? false;
        embedCopyrightExif = profileData.embed_copyright_exif ?? false;
        const copyrightName = profileData.copyright_name || profileData.full_name;
        if (copyrightName) {
          const { formatCopyrightNotice } = await import('@/utils/licenses');
          copyrightNotice = formatCopyrightNotice(copyrightName, new Date().getFullYear(), defaultLicense);
        }
      }

      // Upload files sequentially to maintain order and show progress clearly
      for (let i = 0; i < newUploads.length; i++) {
        const upload = newUploads[i];
        const file = upload.file;

        try {
          // Update status to uploading
          updateUploadingPhoto(upload.id, { status: 'uploading', progress: 0 });

          // Validate file type, size, and resolution
          const fileError = validateImageFile(file, { maxSizeBytes: 10 * 1024 * 1024 });
          if (fileError) {
            throw new Error(`${file.name}: ${fileError.message}`);
          }
          const resError = await validateImageResolution(file);
          if (resError) {
            throw new Error(`${file.name}: ${resError.message}`);
          }

          // Generate path
          const prefix = pathPrefix ?? `${userId}/`;
          const fileExt = file.name.split('.').pop();
          const randomId = crypto.randomUUID();
          const fileName = `${randomId}.${fileExt}`;
          const filePath = `${prefix}${fileName}`;

          // Upload with progress tracking using XHR
          const { publicUrl } = await uploadToStorage(
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
              license: defaultLicense,
              copyright_notice: copyrightNotice,
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to save photo: ${insertError.message}`);
          }

          // Trigger server-side processing (watermark, EXIF) if user has it enabled
          if (watermarkEnabled || embedCopyrightExif) {
            fetch('/api/photos/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ photoId: photoData.id }),
            }).catch(() => {
              // Non-blocking: processing failure doesn't fail the upload
            });
          }

          // Add to albums if specified
          // Note: width/height are no longer written - they're read from photos table via view
          if (albumIds.length > 0 && photoData) {
            const albumPhotoInserts = albumIds.map((albumId) => ({
              album_id: albumId,
              photo_id: photoData.id,
              photo_url: publicUrl, // Kept for cover logic compatibility
              sort_order: sortOrderStart + i,
            }));

            const { error: albumPhotosError } = await supabase
              .from('album_photos')
              .insert(albumPhotoInserts);
            if (albumPhotosError) {
              throw new Error(albumPhotosError.message || 'Failed to add photo to album');
            }

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
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          console.error('Upload error:', err);
          updateUploadingPhoto(upload.id, {
            status: 'error',
            error: message,
          });
        }
      }

      const publicPhotoIds = results.filter((photo) => photo.is_public).map((photo) => photo.id);
      if (publicPhotoIds.length > 0) {
        void notifyFollowersOfUpload(publicPhotoIds);
      }

      if (results.length > 0) {
        const { revalidateAfterPhotoUpload } = await import('@/app/actions/revalidate');
        await revalidateAfterPhotoUpload({
          nickname: profileData?.nickname,
          albumSlugs,
          eventIds,
          isPublic: results.some((photo) => photo.is_public),
        });
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
 * Upload file via server API (service role) so uploads work when storage RLS blocks direct client access.
 */
async function uploadToStorage(
  _supabase: SupabaseClient,
  bucketName: string,
  filePath: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<{ publicUrl: string }> {
  onProgress(10);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucketName);
  formData.append('path', filePath);

  const response = await fetch('/api/photos/upload', {
    method: 'POST',
    body: formData,
  });

  onProgress(80);

  const payload = await response.json().catch(() => ({})) as { publicUrl?: string; error?: string };

  if (!response.ok) {
    throw new Error(payload.error || 'Upload failed');
  }

  if (!payload.publicUrl) {
    throw new Error('Upload failed: missing public URL');
  }

  onProgress(100);

  return { publicUrl: payload.publicUrl };
}
