'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import PhotoMemberTagsModal from '@/components/manage/PhotoMemberTagsModal';
import type { PhotoWithAlbums } from '@/types/photos';
import { useCallback, useContext, useRef } from 'react';

export function useOpenPhotoMemberTagsModal() {
  const modalContext = useContext(ModalContext);
  const openSessionRef = useRef(0);

  return useCallback(
    (photo: PhotoWithAlbums) => {
      openSessionRef.current += 1;
      const sessionKey = openSessionRef.current;

      modalContext.setSize('large');
      modalContext.setTitle('Tag people');
      modalContext.setFlushContentTop(false);
      modalContext.setFooter(null);
      modalContext.setContent(
        <PhotoMemberTagsModal
          key={`photo-member-tags-${photo.id}-${sessionKey}`}
          photo={photo}
          onClose={() => modalContext.setIsOpen(false)}
        />,
      );
      modalContext.setIsOpen(true);
    },
    [modalContext],
  );
}
