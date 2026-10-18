'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import ScrappyCameraIllustration from '@/components/gear/ScrappyCameraIllustration';
import { getGoogleMapsEmbedUrl, getGoogleMapsSearchUrl } from '@/utils/formatLocation';
import CameraApertureIcon from 'public/icons/camera-aperture.svg';
import CameraLensIcon from 'public/icons/camera-lens.svg';
import ImageFrameIcon from 'public/icons/image-frame.svg';
import LocationIcon from 'public/icons/location.svg';
import PhotoCameraIcon from 'public/icons/photo-camera.svg';
import TimeIcon from 'public/icons/time.svg';
import { useContext, type FC, type ReactNode, type SVGProps } from 'react';

type IconComponent = FC<SVGProps<SVGSVGElement>>;

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

type DetailSection = {
  key: string;
  title: string;
  icon: IconComponent;
  value: string;
  body?: ReactNode;
  sectionAside?: ReactNode;
};

function PhotoDetailsModalBody({ sections }: { sections: DetailSection[] }) {
  return (
    <dl
      className="divide-y divide-border-color"
    >
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div
            key={section.key}
            className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0"
          >
            <Icon
              className="size-5 shrink-0 fill-current text-foreground/50"
              aria-hidden
            />
            <div
              className="min-w-0 flex-1"
            >
              <dt
                className="text-xs font-bold text-foreground/60 mt-0.5"
              >
                {section.title}
              </dt>
              <dd
                className="mt-1 text-sm text-foreground"
              >
                {section.value}
                {section.body}
              </dd>
            </div>
            {section.sectionAside}
          </div>
        );
      })}
    </dl>
  );
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

  const sections: DetailSection[] = [];
  if (camera) {
    sections.push({
      key: 'camera',
      title: 'Camera',
      icon: PhotoCameraIcon,
      value: camera,
      sectionAside: (
        <ScrappyCameraIllustration
          camera={camera}
          className="h-10 w-auto shrink-0 object-contain"
        />
      ),
    });
  }
  if (lens) sections.push({ key: 'lens', title: 'Lens', icon: CameraLensIcon, value: lens });
  if (settings) sections.push({ key: 'settings', title: 'Settings', icon: CameraApertureIcon, value: settings });
  if (captureTime) sections.push({ key: 'captured', title: 'Capture time', icon: TimeIcon, value: captureTime });
  if (location) {
    const query = `${location.lat},${location.lng}`;
    const embedUrl = getGoogleMapsEmbedUrl(query);
    const mapsUrl = getGoogleMapsSearchUrl(query);
    sections.push({
      key: 'location',
      title: 'Location',
      icon: LocationIcon,
      value: locationLabel || query,
      body: (
        <div
          className="mt-2"
        >
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-foreground/70 hover:text-primary hover:underline underline-offset-2"
          >
            Open in Google Maps
          </a>
          {embedUrl && (
            <div
              className="mt-2 overflow-hidden border border-border-color"
            >
              <iframe
                title="Map of where this photo was taken"
                src={embedUrl}
                className="h-52 w-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          )}
        </div>
      ),
    });
  }
  if (fileInfo) sections.push({ key: 'file', title: 'File', icon: ImageFrameIcon, value: fileInfo });

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
      <PhotoDetailsModalBody
        sections={sections}
      />,
    );
    modalContext.setIsOpen(true);
  };

  return (
    <div
      className="flex items-center gap-1.5"
    >

      <CompactIcon
        className="size-4 shrink-0 fill-current text-foreground/70"
        aria-hidden
      />
      <p
        className="min-w-0 flex-1 truncate text-xs text-foreground/70"
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
