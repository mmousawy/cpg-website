'use client';

import ScrappyCameraIllustration from '@/components/gear/ScrappyCameraIllustration';
import { getGoogleMapsEmbedUrl, getGoogleMapsSearchUrl } from '@/utils/formatLocation';
import CameraApertureIcon from 'public/icons/camera-aperture.svg';
import CameraLensIcon from 'public/icons/camera-lens.svg';
import ImageFrameIcon from 'public/icons/image-frame.svg';
import LocationIcon from 'public/icons/location.svg';
import PhotoCameraIcon from 'public/icons/photo-camera.svg';
import TimeIcon from 'public/icons/time.svg';
import type { FC, ReactNode, SVGProps } from 'react';

import type { PhotoExifDetailsProps } from './PhotoExifDetails';

type IconComponent = FC<SVGProps<SVGSVGElement>>;

export type PhotoExifDetailSection = {
  key: string;
  title: string;
  icon: IconComponent;
  value: string;
  body?: ReactNode;
  sectionAside?: ReactNode;
};

export function buildPhotoExifDetailSections(
  props: PhotoExifDetailsProps,
): PhotoExifDetailSection[] {
  const { camera, lens, settings, captureTime, location, locationLabel, fileInfo } = props;
  const sections: PhotoExifDetailSection[] = [];

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

  return sections;
}

export function PhotoExifDetailSectionsBody({ sections }: { sections: PhotoExifDetailSection[] }) {
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
