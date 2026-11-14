'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import PhotoMemberTagsModal from '@/components/manage/PhotoMemberTagsModal';
import { UnsavedChangesProvider } from '@/context/UnsavedChangesContext';
import { getPhotoMemberTagsClientState } from '@/lib/photoMemberTags/clientStore';
import type { PhotoWithAlbums } from '@/types/photos';
import { Fragment, useCallback, useContext, useRef } from 'react';

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
      const cachedMemberTags = getPhotoMemberTagsClientState(photo.id);
      const contentKey = `photo-member-tags-${photo.id}-${sessionKey}`;
      const modal = (
        <PhotoMemberTagsModal
          photo={photo}
          initialMemberTags={cachedMemberTags.loaded ? cachedMemberTags.tags : undefined}
          onClose={() => modalContext.setIsOpen(false)}
        />
      );
      modalContext.setContent(
        typeof window !== 'undefined' && window.__unsavedChangesContext
          ? (
            <Fragment
              key={contentKey}
            >
              {modal}
            </Fragment>
          )
          : (
            <UnsavedChangesProvider
              key={contentKey}
            >
              {modal}
            </UnsavedChangesProvider>
          ),
      );
      modalContext.setIsOpen(true);
    },
    [modalContext],
  );
}
