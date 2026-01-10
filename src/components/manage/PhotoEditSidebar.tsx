'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import AlbumMiniCard from '@/components/album/AlbumMiniCard';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import Toggle from '@/components/shared/Toggle';
import type { PhotoWithAlbums } from '@/types/photos';
import { zodResolver } from '@hookform/resolvers/zod';
import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import PlusSVG from 'public/icons/plus.svg';
import TrashSVG from 'public/icons/trash.svg';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import PhotoEditEmptyState from './PhotoEditEmptyState';
import PhotoListItem from './PhotoListItem';
import SidebarPanel from './SidebarPanel';

const photoFormSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  is_public: z.boolean(),
});

export type PhotoFormData = z.infer<typeof photoFormSchema>;

// Bulk edit schema - all fields optional (only apply changed values)
const bulkPhotoFormSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  is_public: z.boolean().nullable(),
});

export type BulkPhotoFormData = z.infer<typeof bulkPhotoFormSchema>;

interface PhotoEditSidebarProps {
  selectedPhotos: PhotoWithAlbums[];
  onSave: (photoId: string, data: PhotoFormData) => Promise<void>;
  onBulkSave?: (photoIds: string[], data: BulkPhotoFormData) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  /** Handler for bulk deletion. If provided, used for multi-select delete (more efficient). */
  onBulkDelete?: (photoIds: string[]) => Promise<void>;
  /** Handler for adding photos to album. If not provided, the Album button is hidden. */
  onAddToAlbum?: (photoIds: string[]) => void;
  /** Handler for removing photos from the current album (only shown in album view). */
  onRemoveFromAlbum?: (photoIds: string[]) => void;
  isLoading?: boolean;
  /** Called when dirty state changes - parent can use this to warn before deselecting */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Ref to check if there are unsaved changes */
  isDirtyRef?: React.MutableRefObject<boolean>;
  /** External saving state (for batch operations) */
  isSaving?: boolean;
  /** Error message from parent */
  externalError?: string | null;
  /** Success state from parent */
  externalSuccess?: boolean;
}

/** Bulk edit form for multiple photos */
function BulkEditForm({
  selectedPhotos,
  onBulkSave,
  onDelete,
  onBulkDelete,
  onAddToAlbum,
  onRemoveFromAlbum,
  isLoading,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
}: {
  selectedPhotos: PhotoWithAlbums[];
  onBulkSave?: (photoIds: string[], data: BulkPhotoFormData) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onBulkDelete?: (photoIds: string[]) => Promise<void>;
  onAddToAlbum?: (photoIds: string[]) => void;
  onRemoveFromAlbum?: (photoIds: string[]) => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isDirtyRef?: React.MutableRefObject<boolean>;
  isSaving?: boolean;
  externalError?: string | null;
  externalSuccess?: boolean;
}) {
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if all photos have the same is_public value
  const allPublic = selectedPhotos.every((p) => p.is_public);
  const allPrivate = selectedPhotos.every((p) => !p.is_public);
  const mixedVisibility = !allPublic && !allPrivate;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<BulkPhotoFormData>({
    resolver: zodResolver(bulkPhotoFormSchema),
    defaultValues: {
      title: null,
      description: null,
      is_public: mixedVisibility ? null : allPublic,
    },
  });

  const isSaving = isSubmitting || externalIsSaving;

  // Update dirty ref and call callback when dirty state changes
  useEffect(() => {
    if (isDirtyRef) {
      isDirtyRef.current = isDirty;
    }
    onDirtyChange?.(isDirty);
  }, [isDirty, isDirtyRef, onDirtyChange]);

  // Handle Delete key for bulk deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' && !isSaving && !isLoading && !isDeleting) {
        e.preventDefault();
        handleBulkDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const onSubmit = async (data: BulkPhotoFormData) => {
    if (!onBulkSave) {
      setLocalError('Bulk save not supported');
      return;
    }

    setLocalError(null);
    setLocalSuccess(false);

    try {
      const photoIds = selectedPhotos.map((p) => p.id);
      await onBulkSave(photoIds, data);
      // Reset form to mark as not dirty after successful save
      reset(data);
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save photos');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedPhotos.length;

    const confirmed = await confirm({
      title: 'Delete photos',
      message: `Are you sure you want to delete ${count} photo${count !== 1 ? 's' : ''}? This action cannot be undone.`,
      content: (
        <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
          {selectedPhotos.map((photo) => (
            <PhotoListItem key={photo.id} photo={photo} variant="detailed" />
          ))}
        </div>
      ),
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsDeleting(true);
    setLocalError(null);

    try {
      if (onBulkDelete) {
        // Use optimized bulk delete RPC
        const photoIds = selectedPhotos.map((p) => p.id);
        await onBulkDelete(photoIds);
      } else {
        // Fallback: delete photos one by one
        for (const photo of selectedPhotos) {
          await onDelete(photo.id);
        }
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete photos');
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerSubmit = () => {
    formRef.current?.requestSubmit();
  };

  const error = externalError || localError;
  const success = externalSuccess || localSuccess;

  return (
    <SidebarPanel
      title={`Edit ${selectedPhotos.length} photos`}
      footer={
        <div className="flex gap-2 w-full">
          <Button
            type="button"
            variant="danger"
            onClick={handleBulkDelete}
            disabled={isSaving || isLoading || isDeleting}
            loading={isDeleting}
            icon={<TrashSVG className="size-4 -ml-0.5" />}
          >
            Delete
          </Button>
          {onAddToAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAddToAlbum(selectedPhotos.map((p) => p.id))}
              icon={<PlusSVG className="size-4 -ml-0.5" />}
            >
              Album
            </Button>
          )}
          {onRemoveFromAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onRemoveFromAlbum(selectedPhotos.map((p) => p.id))}
              icon={<CloseSVG className="size-4 -ml-0.5" />}
            >
              Remove
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || isLoading || !isDirty}
            loading={isSaving}
            icon={<CheckSVG className="size-4 -ml-0.5" />}
            className="ml-auto"
          >
            {success ? 'Saved!' : 'Save'}
          </Button>
        </div>
      }
    >
      {/* Selected photos list */}
      <div className="mb-6 max-h-48 space-y-1 overflow-y-auto">
        {selectedPhotos.map((photo) => (
          <PhotoListItem key={photo.id} photo={photo} variant="detailed" />
        ))}
      </div>

      {/* Bulk edit form */}
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="bulk_title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="bulk_title"
            type="text"
            {...register('title')}
            placeholder="Set same title for all (leave empty to skip)"
          />
          <p className="text-xs text-foreground/50">
            Leave empty to keep existing titles
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="bulk_description" className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id="bulk_description"
            {...register('description')}
            rows={3}
            placeholder="Set same description for all (leave empty to skip)"
          />
          <p className="text-xs text-foreground/50">
            Leave empty to keep existing descriptions
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Toggle
            id="bulk_is_public"
            leftLabel="Private"
            rightLabel="Public"
            {...register('is_public')}
            label="Visibility"
          />
          {mixedVisibility && (
            <span className="text-xs text-foreground/50">(currently mixed)</span>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

      </form>
    </SidebarPanel>
  );
}

/** Single photo edit form */
function SinglePhotoEditForm({
  photo,
  onSave,
  onDelete,
  onAddToAlbum,
  onRemoveFromAlbum,
  isLoading,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
}: {
  photo: PhotoWithAlbums;
  onSave: (photoId: string, data: PhotoFormData) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onAddToAlbum?: (photoIds: string[]) => void;
  onRemoveFromAlbum?: (photoIds: string[]) => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isDirtyRef?: React.MutableRefObject<boolean>;
  isSaving?: boolean;
  externalError?: string | null;
  externalSuccess?: boolean;
}) {
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState(false);
  const photoAlbums = photo.albums || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<PhotoFormData>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      title: photo.title || null,
      description: photo.description || null,
      is_public: photo.is_public ?? true,
    },
  });

  const isSaving = isSubmitting || externalIsSaving;

  // Update dirty ref and call callback when dirty state changes
  useEffect(() => {
    if (isDirtyRef) {
      isDirtyRef.current = isDirty;
    }
    onDirtyChange?.(isDirty);
  }, [isDirty, isDirtyRef, onDirtyChange]);

  // Reset form when selected photo changes
  useEffect(() => {
    reset({
      title: photo.title || null,
      description: photo.description || null,
      is_public: photo.is_public ?? true,
    });
    setLocalError(null);
    setLocalSuccess(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id, reset]);

  // Handle Delete key for single photo deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' && !isSaving && !isLoading) {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const onSubmit = async (data: PhotoFormData) => {
    setLocalError(null);
    setLocalSuccess(false);

    try {
      await onSave(photo.id, data);
      // Reset form to mark as not dirty after successful save
      reset(data);
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save photo');
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Photo',
      message: 'Are you sure you want to delete this photo? This action cannot be undone.',
      content: (
        <div className="grid gap-2">
          <PhotoListItem photo={photo} variant="detailed" />
        </div>
      ),
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;
    await onDelete(photo.id);
  };

  const triggerSubmit = () => {
    formRef.current?.requestSubmit();
  };

  const error = externalError || localError;
  const success = externalSuccess || localSuccess;

  return (
    <SidebarPanel
      title="Edit Photo"
      footer={
        <div className="flex gap-2 w-full">
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isSaving || isLoading}
            icon={<TrashSVG className="size-4 -ml-0.5" />}
          >
            Delete
          </Button>
          {onAddToAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAddToAlbum([photo.id])}
              icon={<PlusSVG className="size-4 -ml-0.5" />}
            >
              Album
            </Button>
          )}
          {onRemoveFromAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onRemoveFromAlbum([photo.id])}
              icon={<CloseSVG className="size-4 -ml-0.5" />}
            >
              Remove
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || isLoading || !isDirty}
            loading={isSaving}
            icon={<CheckSVG className="size-4 -ml-0.5" />}
            className="ml-auto"
          >
            {success ? 'Saved!' : 'Save'}
          </Button>
        </div>
      }
    >
      {/* Photo thumbnail */}
      <div className="mb-6">
        <PhotoListItem photo={photo} variant="detailed" />
      </div>

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={`title-${photo.id}`} className="text-sm font-medium">
            Title
          </label>
          <Input
            id={`title-${photo.id}`}
            type="text"
            {...register('title')}
            placeholder="Photo title (optional)"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`description-${photo.id}`} className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id={`description-${photo.id}`}
            {...register('description')}
            rows={3}
            placeholder="Tell us about this photo..."
          />
        </div>

        <Toggle
          id={`is_public-${photo.id}`}
          leftLabel="Private"
          rightLabel="Public"
          {...register('is_public')}
          label="Visibility"
        />
        {/* Albums this photo belongs to */}
        {photoAlbums.length > 0 && (
          <>
            <hr className="my-4 border-border-color" />
            <div>
              <h3 className="mb-2 text-sm font-medium">Part of:</h3>
              <div className="grid grid-cols-2 gap-2">
                {photoAlbums.map((album) => (
                  <AlbumMiniCard
                    key={album.id}
                    title={album.title}
                    slug={album.slug}
                    coverImageUrl={album.cover_image_url}
                    href={`/account/albums/${album.slug}`}
                    photoCount={album.photo_count}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

      </form>
    </SidebarPanel>
  );
}

export default function PhotoEditSidebar({
  selectedPhotos,
  onSave,
  onBulkSave,
  onDelete,
  onBulkDelete,
  onAddToAlbum,
  onRemoveFromAlbum,
  isLoading = false,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
}: PhotoEditSidebarProps) {
  const photo = selectedPhotos[0];
  const isMultiple = selectedPhotos.length > 1;

  if (!photo) {
    return (
      <SidebarPanel>
        <PhotoEditEmptyState />
      </SidebarPanel>
    );
  }

  // Multiple photos - bulk edit mode
  if (isMultiple) {
    return (
      <BulkEditForm
        selectedPhotos={selectedPhotos}
        onBulkSave={onBulkSave}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        onAddToAlbum={onAddToAlbum}
        onRemoveFromAlbum={onRemoveFromAlbum}
        isLoading={isLoading}
        onDirtyChange={onDirtyChange}
        isDirtyRef={isDirtyRef}
        isSaving={externalIsSaving}
        externalError={externalError}
        externalSuccess={externalSuccess}
      />
    );
  }

  // Single photo mode
  return (
    <SinglePhotoEditForm
      photo={photo}
      onSave={onSave}
      onDelete={onDelete}
      onAddToAlbum={onAddToAlbum}
      onRemoveFromAlbum={onRemoveFromAlbum}
      isLoading={isLoading}
      onDirtyChange={onDirtyChange}
      isDirtyRef={isDirtyRef}
      isSaving={externalIsSaving}
      externalError={externalError}
      externalSuccess={externalSuccess}
    />
  );
}
