'use client';

import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import { PhotoMemberTagLayer } from '@/components/photo/PhotoMemberTags';
import { ModalContext } from '@/app/providers/ModalProvider';
import type { PhotoWithAlbums } from '@/types/photos';
import { useContext, useEffect, useMemo, useRef } from 'react';

type PhotoMemberTagsModalProps = {
  photo: PhotoWithAlbums;
  onClose: () => void;
};

/** Max rendered height for the image (viewport minus modal chrome + helper text + stage padding). */
const imageMaxHeightClass =
  'max-h-[calc(100dvh-20rem)] sm:max-h-[calc(100dvh-21rem)]';

export default function PhotoMemberTagsModal({ photo, onClose }: PhotoMemberTagsModalProps) {
  const modalContext = useContext(ModalContext);
  const handleCloseRef = useRef<(() => void) | null>(null);

  const width = photo.width || 1200;
  const height = photo.height || 800;
  const displayName = photo.title || photo.original_filename || 'Photo';

  useEffect(() => {
    handleCloseRef.current = () => {
      modalContext.setIsOpen(false);
      onClose();
    };
  }, [modalContext, onClose]);

  const footerContent = useMemo(
    () => (
      <div
        className="flex justify-end"
      >
        <Button
          type="button"
          onClick={() => handleCloseRef.current?.()}
        >
          Done
        </Button>
      </div>
    ),
    [],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
    return () => modalContext.setBeforeCloseCheck(null);
  }, [footerContent, modalContext]);

  return (
    <div
      className="flex flex-col gap-3"
    >
      <p
        className="text-sm text-foreground/80"
      >
        Click the photo to place a tag, then pick a member. Each person can only be tagged once.
      </p>
      <div
        className="flex justify-center rounded-lg border border-border-color bg-background-medium p-2 sm:p-3"
      >
        <div
          className="relative mx-auto w-fit max-w-full"
        >
          <BlurImage
            src={photo.url}
            alt={displayName}
            width={width}
            height={height}
            blurhash={photo.blurhash}
            contain
            unoptimized
            className={`max-w-full ${imageMaxHeightClass}`}
            style={{ aspectRatio: `${width}/${height}` }}
          />
          <PhotoMemberTagLayer
            photoId={photo.id}
            allowPlacement
            showPlacementControl={false}
            autoTagMode
            hideInlineHints
          />
        </div>
      </div>
    </div>
  );
}
