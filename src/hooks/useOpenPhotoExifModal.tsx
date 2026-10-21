'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import PhotoExifModal from '@/components/manage/PhotoExifModal';
import type { PhotoFilter } from '@/hooks/photoQueryCache';
import type { PhotoWithAlbums } from '@/types/photos';
import { useCallback, useContext } from 'react';

type UseOpenPhotoExifModalOptions = {
  photoFilter?: PhotoFilter;
  albumId?: string | null;
};

export function useOpenPhotoExifModal({
  photoFilter = 'all',
  albumId = null,
}: UseOpenPhotoExifModalOptions = {}) {
  const modalContext = useContext(ModalContext);

  return useCallback(
    (photos: PhotoWithAlbums | PhotoWithAlbums[], readOnly = false) => {
      const list = Array.isArray(photos) ? photos : [photos];
      if (list.length === 0) return;

      const title = list.length > 1
        ? `Capture details (${list.length} photos)`
        : 'Capture details';

      modalContext.setSize('medium');
      modalContext.setTitle(title);
      modalContext.setFlushContentTop(false);
      modalContext.setFooter(null);
      modalContext.setContent(
        <PhotoExifModal
          photos={list}
          readOnly={readOnly}
          photoFilter={photoFilter}
          albumId={albumId}
          onClose={() => modalContext.setIsOpen(false)}
        />,
      );
      modalContext.setIsOpen(true);
    },
    [albumId, modalContext, photoFilter],
  );
}
