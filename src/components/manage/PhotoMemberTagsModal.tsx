'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import {
  PhotoMemberTagLayer,
  type PhotoMemberTagLayerHandle,
} from '@/components/photo/PhotoMemberTags';
import type { PhotoMemberTag } from '@/lib/data/photoMemberTags';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmUnsavedChanges } from '@/utils/confirmHelpers';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type PhotoMemberTagsModalProps = {
  photo: PhotoWithAlbums;
  initialMemberTags?: PhotoMemberTag[];
  onClose: () => void;
};

export default function PhotoMemberTagsModal({
  photo,
  initialMemberTags,
  onClose,
}: PhotoMemberTagsModalProps) {
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const tagLayerRef = useRef<PhotoMemberTagLayerHandle>(null);
  const skipCloseCheckRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasChangesRef = useRef(false);
  const savingRef = useRef(false);
  savingRef.current = saving;

  const setGlobalUnsavedChanges = useCallback((dirty: boolean) => {
    window.__unsavedChangesContext?.setHasUnsavedChanges(dirty);
  }, []);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    hasChangesRef.current = dirty;
    setHasChanges(dirty);
    setGlobalUnsavedChanges(dirty);
  }, [setGlobalUnsavedChanges]);

  const handleSave = useCallback(async () => {
    if (!hasChangesRef.current) return;
    setSaveError(null);
    setSaving(true);
    try {
      const result = await tagLayerRef.current?.save() ?? { ok: true as const };
      if (!result.ok) {
        setSaveError(result.message);
        return;
      }
      skipCloseCheckRef.current = true;
      setHasChanges(false);
      setGlobalUnsavedChanges(false);
      modalContext.setIsOpen(false);
      onClose();
    } finally {
      setSaving(false);
    }
  }, [modalContext, onClose, setGlobalUnsavedChanges]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const handleCancelRef = useRef(() => {
    void modalContext.requestClose();
  });
  handleCancelRef.current = () => {
    void modalContext.requestClose();
  };

  const width = photo.width || 1200;
  const height = photo.height || 800;
  const displayName = photo.title || photo.original_filename || 'Photo';

  const footerContent = useMemo(
    () => (
      <div
        className="flex flex-col items-end gap-2"
      >
        {saveError ? (
          <p
            className="w-full text-right text-sm text-red-500"
          >
            {saveError}
          </p>
        ) : null}
        <div
          className="flex gap-2"
        >
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => handleCancelRef.current()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || !hasChanges}
            loading={saving}
            onClick={() => { void handleSaveRef.current(); }}
          >
            Save
          </Button>
        </div>
      </div>
    ),
    [hasChanges, saveError, saving],
  );

  useEffect(() => {
    modalContext.setFooter(footerContent);
  }, [footerContent, modalContext]);

  useEffect(() => {
    modalContext.setBeforeCloseCheck(async () => {
      if (skipCloseCheckRef.current) {
        skipCloseCheckRef.current = false;
        return true;
      }
      if (savingRef.current) return false;
      const dirty = tagLayerRef.current?.hasUnsavedChanges() ?? hasChangesRef.current;
      if (!dirty) return true;
      const confirmed = await confirm(confirmUnsavedChanges());
      if (confirmed) setGlobalUnsavedChanges(false);
      return confirmed;
    });
    return () => {
      modalContext.setBeforeCloseCheck(null);
      setGlobalUnsavedChanges(false);
    };
  }, [confirm, modalContext, setGlobalUnsavedChanges]);

  return (
    <div
      className="flex flex-col gap-3"
    >
      <p
        className="text-sm text-foreground/80"
      >
        Click the photo to add a tag, then pick a member. Drag a tag to move it. Click a tag for
        {' '}
        Remove tag
        {' '}
        or
        {' '}
        Edit tag
        . Press Save to keep your changes.
      </p>
      <div
        className="flex justify-center rounded-lg border border-border-color bg-background-medium p-2 sm:p-3"
      >
        <div
          className="relative mx-auto w-full max-w-full overflow-visible"
        >
          <BlurImage
            src={photo.url}
            alt={displayName}
            width={width}
            height={height}
            blurhash={photo.blurhash}
            contain
            unoptimized
            className="[--photo-max-h:calc(100dvh-20rem)] sm:[--photo-max-h:calc(100dvh-21rem)]"
            style={{ aspectRatio: `${width}/${height}` }}
          />
          <PhotoMemberTagLayer
            ref={tagLayerRef}
            photoId={photo.id}
            allowPlacement
            showPlacementControl={false}
            autoTagMode
            hideInlineHints
            saveOnDone
            isActive={modalContext.isOpen}
            initialMemberTags={initialMemberTags}
            onDirtyChange={handleDirtyChange}
          />
        </div>
      </div>
    </div>
  );
}
