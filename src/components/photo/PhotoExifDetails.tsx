'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import {
  buildPhotoExifDetailSections,
  PhotoExifDetailSectionsBody,
} from '@/components/photo/photoExifDetailSections';
import CameraApertureIcon from 'public/icons/camera-aperture.svg';
import CameraLensIcon from 'public/icons/camera-lens.svg';
import ImageFrameIcon from 'public/icons/image-frame.svg';
import LocationIcon from 'public/icons/location.svg';
import PhotoCameraIcon from 'public/icons/photo-camera.svg';
import TimeIcon from 'public/icons/time.svg';
import { useContext } from 'react';

export interface PhotoExifDetailsProps {
  camera?: string | null;
  lens?: string | null;
  /** Exposure, ISO, and aperture, comma-separated. */
  settings?: string | null;
  /** When the camera recorded the photo. */
  captureTime?: string | null;
  /** GPS coordinates from the photo. */
  location?: { lat: number; lng: number } | null;
  /** Human-readable GPS label. */
  locationLabel?: string | null;
  /** Dimensions and file size. */
  fileInfo?: string | null;
}

/**
 * Compact capture line. "See more" opens camera, lens, settings, capture time, location, and file info.
 */
export default function PhotoExifDetails({
  camera,
  lens,
  settings,
  captureTime,
  location,
  locationLabel,
  fileInfo,
}: PhotoExifDetailsProps) {
  const modalContext = useContext(ModalContext);

  const sections = buildPhotoExifDetailSections({
    camera,
    lens,
    settings,
    captureTime,
    location,
    locationLabel,
    fileInfo,
  });

  if (sections.length === 0) return null;

  const compactParts = [camera, lens, settings].filter((part): part is string => !!part);
  const CompactIcon = camera
    ? PhotoCameraIcon
    : lens
      ? CameraLensIcon
      : settings
        ? CameraApertureIcon
        : captureTime
          ? TimeIcon
          : location
            ? LocationIcon
            : ImageFrameIcon;
  const summary = compactParts.length > 0 ? compactParts.join(' • ') : sections[0].value;
  const showDetails = sections.length > 1 || !!location;

  const openDetails = () => {
    modalContext.setSize(location ? 'medium' : 'small');
    modalContext.setFooter(null);
    modalContext.setFlushContentTop(false);
    modalContext.setTitle('Photo details');
    modalContext.setContent(
      <PhotoExifDetailSectionsBody
        sections={sections}
      />,
    );
    modalContext.setIsOpen(true);
  };

  return (
    <div
      className="flex min-w-0 items-center gap-1.5"
    >

      <CompactIcon
        className="size-4 shrink-0 fill-current text-foreground/70"
        aria-hidden
      />
      <p
        className="min-w-0 truncate text-xs text-foreground/70"
        title={summary}
      >
        {summary}
      </p>
      {showDetails && (
        <button
          type="button"
          onClick={openDetails}
          className="inline-flex h-5 shrink-0 items-center justify-center rounded-full border border-border-color-strong bg-background-raised px-2 text-xs text-foreground/60 transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
          aria-label="Photo details"
        >
          See more
        </button>
      )}
    </div>
  );
}
