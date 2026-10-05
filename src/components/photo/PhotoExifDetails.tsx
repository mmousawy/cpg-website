'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import CameraApertureIcon from 'public/icons/camera-aperture.svg';
import CameraLensIcon from 'public/icons/camera-lens.svg';
import ImageFrameIcon from 'public/icons/image-frame.svg';
import PhotoCameraIcon from 'public/icons/photo-camera.svg';
import { useContext, type FC, type SVGProps } from 'react';

type IconComponent = FC<SVGProps<SVGSVGElement>>;

export interface PhotoExifDetailsProps {
  camera?: string | null;
  lens?: string | null;
  /** Exposure, ISO, and aperture, comma-separated. */
  settings?: string | null;
  /** Dimensions and file size. */
  fileInfo?: string | null;
}

type DetailSection = {
  key: string;
  title: string;
  icon: IconComponent;
  value: string;
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
              className="size-5 shrink-0 text-foreground/50"
              aria-hidden
            />
            <div
              className="min-w-0"
            >
              <dt
                className="text-xs font-bold text-foreground/60 mt-0.5"
              >
                {section.title}
              </dt>
              <dd
                className="text-sm text-foreground mt-1"
              >
                {section.value}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * Compact capture line. A (+) opens camera, lens, settings, and file info in a modal.
 */
export default function PhotoExifDetails({
  camera,
  lens,
  settings,
  fileInfo,
}: PhotoExifDetailsProps) {
  const modalContext = useContext(ModalContext);

  const sections: DetailSection[] = [];
  if (camera) sections.push({ key: 'camera', title: 'Camera', icon: PhotoCameraIcon, value: camera });
  if (lens) sections.push({ key: 'lens', title: 'Lens', icon: CameraLensIcon, value: lens });
  if (settings) sections.push({ key: 'settings', title: 'Settings', icon: CameraApertureIcon, value: settings });
  if (fileInfo) sections.push({ key: 'file', title: 'File', icon: ImageFrameIcon, value: fileInfo });

  if (sections.length === 0) return null;

  const compactParts = [camera, lens, settings].filter((part): part is string => !!part);
  const CompactIcon = camera ? PhotoCameraIcon : lens ? CameraLensIcon : settings ? CameraApertureIcon : ImageFrameIcon;
  const summary = compactParts.length > 0 ? compactParts.join(' • ') : sections[0].value;

  const openDetails = () => {
    modalContext.setSize('small');
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
        className="size-4 shrink-0 text-foreground/70"
        aria-hidden
      />
      <p
        className="min-w-0 flex-1 truncate text-xs text-foreground/70"
        title={summary}
      >
        {summary}
      </p>
      {sections.length > 1 && (
        <button
          type="button"
          onClick={openDetails}
          className="inline-flex h-5 shrink-0 items-center justify-center rounded-full border border-border-color-strong bg-background-medium px-2 text-xs text-foreground/60 transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground dark:bg-[#2e3032]"
          aria-label="Photo details"
        >
          See more
        </button>
      )}
    </div>
  );
}
