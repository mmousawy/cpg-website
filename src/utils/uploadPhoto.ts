import exifr from 'exifr';
import { customAlphabet } from 'nanoid';

// Lowercase alphanumeric without vowels to avoid profanity
const nanoid = customAlphabet('bcdfghjklmnpqrstvwxyz0123456789', 5);
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateBlurhash } from './generateBlurhash';
import type { Photo } from '@/types/photos';

export interface UploadPhotoOptions {
  albumIds?: string[]; // Can add to multiple albums
  isPublic?: boolean; // Default: true
  title?: string; // Optional caption
  description?: string; // Optional description
  bucketName?: string; // Default: 'user-photos'
}

/**
 * Upload a photo to Supabase Storage and create database record
 * @param file - Image file to upload
 * @param userId - User ID uploading the photo
 * @param supabase - Supabase client instance
 * @param options - Upload options
 * @returns Promise resolving to the created Photo record
 */
export async function uploadPhoto(
  file: File,
  userId: string,
  supabase: SupabaseClient,
  options: UploadPhotoOptions = {}
): Promise<Photo> {
  const {
    albumIds = [],
    isPublic = true,
    title = null,
    description = null,
    bucketName = 'user-photos',
  } = options;

  // 1. Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.name}`);
  }

  // 2. Validate file size (max 5 MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large: ${file.name}`);
  }

  // 3. Generate random filename
  const fileExt = file.name.split('.').pop();
  const randomId = crypto.randomUUID();
  const fileName = `${randomId}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // 4. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${file.name} - ${uploadError.message}`);
  }

  // 5. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  // 6. Get image dimensions
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });

  // 7. Extract EXIF data
  let exifData = null;
  try {
    exifData = await exifr.parse(file, {
      pick: [
        'Make',
        'Model',
        'DateTimeOriginal',
        'ExposureTime',
        'FNumber',
        'ISO',
        'FocalLength',
        'LensModel',
        'GPSLatitude',
        'GPSLongitude',
      ],
    });
  } catch (err) {
    console.warn('Failed to extract EXIF data:', err);
  }

  // 8. Generate blurhash
  const blurhash = await generateBlurhash(file);

  // 9. Generate short_id for clean URLs (5 chars, no vowels = ~28 million combinations)
  const shortId = nanoid();

  // 10. Insert into photos table
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
      title,
      description,
      is_public: isPublic,
      blurhash,
      short_id: shortId,
      original_filename: file.name,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to save photo metadata: ${insertError.message}`);
  }

  // 11. If albumIds provided, insert into album_photos for each
  if (albumIds.length > 0 && photoData) {
    const albumPhotoInserts = albumIds.map((albumId, index) => ({
      album_id: albumId,
      photo_id: photoData.id,
      photo_url: publicUrl,
      width: img.width,
      height: img.height,
      sort_order: index,
    }));

    const { error: albumPhotosError } = await supabase
      .from('album_photos')
      .insert(albumPhotoInserts);

    if (albumPhotosError) {
      console.warn('Failed to add photos to albums:', albumPhotosError);
      // Don't fail the whole operation, just log the error
    }
  }

  // Clean up
  URL.revokeObjectURL(img.src);

  return photoData as Photo;
}

