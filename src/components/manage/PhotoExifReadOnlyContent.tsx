'use client';

import {
  buildPhotoExifDetailSections,
  PhotoExifDetailSectionsBody,
} from '@/components/photo/photoExifDetailSections';
import type { PhotoWithAlbums } from '@/types/photos';
import { getFormattedExif } from '@/utils/exif';
import { formatFileSize } from '@/utils/formatFileSize';
import { useMemo } from 'react';

type PhotoExifReadOnlyContentProps = {
  photo: PhotoWithAlbums;
};

export default function PhotoExifReadOnlyContent({ photo }: PhotoExifReadOnlyContentProps) {
  const sections = useMemo(() => {
    const exif = getFormattedExif(photo.exif_data as Record<string, unknown> | null | undefined);
    const fileSizeLabel = formatFileSize(photo.file_size);
    const dimensionLabel = photo.width && photo.height ? `${photo.width} × ${photo.height}` : null;
    const fileInfo = [dimensionLabel, fileSizeLabel].filter(Boolean).join(' · ') || null;

    return buildPhotoExifDetailSections({
      camera: exif?.camera ?? null,
      lens: exif?.lens ?? null,
      settings: exif?.settingsLine ?? null,
      captureTime: exif?.dateTaken ?? null,
      location: exif?.location ?? null,
      locationLabel: exif?.locationLabel ?? null,
      fileInfo,
    });
  }, [photo.exif_data, photo.file_size, photo.height, photo.width]);

  if (sections.length === 0) {
    return (
      <p
        className="text-sm text-foreground/70"
      >
        No capture details for this photo.
      </p>
    );
  }

  return (
    <PhotoExifDetailSectionsBody
      sections={sections}
    />
  );
}
