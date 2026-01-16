'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import AlbumMiniCard from '@/components/album/AlbumMiniCard';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import TagInput from '@/components/shared/TagInput';
import Textarea from '@/components/shared/Textarea';
import Toggle from '@/components/shared/Toggle';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmDeletePhoto, confirmDeletePhotos } from '@/utils/confirmHelpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import PhotoEditEmptyState from './PhotoEditEmptyState';
import PhotoListItem from './PhotoListItem';
import SidebarPanel from './SidebarPanel';

import CheckMiniSVG from 'public/icons/check-mini.svg';
import CloseMiniSVG from 'public/icons/close-mini.svg';
import FolderDownMiniSVG from 'public/icons/folder-down-mini.svg';
import TrashSVG from 'public/icons/trash.svg';
import WallArtSVG from 'public/icons/wall-art.svg';

const photoFormSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  is_public: z.boolean(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
});

export type PhotoFormData = z.infer<typeof photoFormSchema>;

// Bulk edit schema - all fields optional (only apply changed values)
const bulkPhotoFormSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  is_public: z.boolean().nullable(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional(),
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
  /** Handler for setting photo as album cover. If provided with currentAlbum, shows the button. */
  onSetAsCover?: (photoUrl: string, albumId: string) => Promise<void>;
  /** Current album context - used to show "Set as cover" option */
  currentAlbum?: { id: string; slug: string; cover_image_url: string | null } | null;
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

  // Find tags that are common across ALL selected photos
  const getCommonTags = (photos: PhotoWithAlbums[]): string[] => {
    if (photos.length === 0) return [];

    const tagSets = photos.map((p) => {
      const tags = p.tags?.map((t) => t.tag.toLowerCase()) || [];
      return new Set(tags);
    });

    if (tagSets.length === 0) return [];

    // Start with tags from first photo, then intersect with others
    const commonTags = Array.from(tagSets[0]).filter((tag) =>
      tagSets.every((tagSet) => tagSet.has(tag)),
    );

    return commonTags.sort();
  };

  // Calculate tag counts across all selected photos
  const getTagCounts = (photos: PhotoWithAlbums[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    photos.forEach((photo) => {
      const tags = photo.tags?.map((t) => t.tag.toLowerCase()) || [];
      tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  };

  const commonTags = getCommonTags(selectedPhotos);
  const tagCounts = getTagCounts(selectedPhotos);
  // Get all unique tags sorted by count (descending), then alphabetically (for display only)
  const allTags = Object.keys(tagCounts)
    .sort((a, b) => {
      const countDiff = tagCounts[b] - tagCounts[a];
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<BulkPhotoFormData>({
    resolver: zodResolver(bulkPhotoFormSchema),
    defaultValues: {
      title: null,
      description: null,
      is_public: mixedVisibility ? null : allPublic,
      tags: commonTags, // Only include fully shared tags in form
    },
  });

  const watchedTags = watch('tags');
  const isSaving = isSubmitting || externalIsSaving;

  // Reset form when selection changes to update tags (only common tags)
  useEffect(() => {
    const newCommonTags = getCommonTags(selectedPhotos);
    reset({
      title: null,
      description: null,
      is_public: mixedVisibility ? null : allPublic,
      tags: newCommonTags, // Only reset to common tags
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhotos.map((p) => p.id).join(',')]);

  const handleAddTag = (tag: string) => {
    const currentTags = watchedTags || [];
    if (currentTags.length < 5 && !currentTags.includes(tag)) {
      setValue('tags', [...currentTags, tag], { shouldDirty: true });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter((t) => t !== tagToRemove), { shouldDirty: true });
  };

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
    const confirmed = await confirm(confirmDeletePhotos(selectedPhotos));
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
            icon={<TrashSVG className="size-5 -ml-0.5" />}
          >
            Delete
          </Button>
          {onAddToAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAddToAlbum(selectedPhotos.map((p) => p.id))}
              icon={<FolderDownMiniSVG className="size-5 -ml-0.5" />}
            >
              Album
            </Button>
          )}
          {onRemoveFromAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onRemoveFromAlbum(selectedPhotos.map((p) => p.id))}
              icon={<CloseMiniSVG className="size-5 -ml-0.5" />}
            >
              Remove
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || isLoading || !isDirty}
            loading={isSaving}
            icon={<CheckMiniSVG className="size-5 -ml-0.5" />}
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Tags</label>
          <TagInput
            id="bulk_tags"
            tags={watchedTags || []}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            tagCounts={tagCounts}
            totalCount={selectedPhotos.length}
            readOnlyTags={allTags.filter((tag) => !commonTags.includes(tag))}
            helperText="Tags will be synced to match the form. Partially shared tags are shown but won't be added to other items."
          />
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
  onSetAsCover,
  currentAlbum,
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
  onSetAsCover?: (photoUrl: string, albumId: string) => Promise<void>;
  currentAlbum?: { id: string; slug: string; cover_image_url: string | null } | null;
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
  const [isSettingCover, setIsSettingCover] = useState(false);
  const photoAlbums = photo.albums || [];

  // Check if this photo is already the cover of the current album
  const isCurrentCover = currentAlbum?.cover_image_url === photo.url;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, isSubmitting },
  } = useForm<PhotoFormData>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      title: photo.title || null,
      description: photo.description || null,
      is_public: photo.is_public ?? true,
      tags: photo.tags?.map((t) => t.tag) || [],
    },
  });

  const watchedTags = watch('tags');
  const isSaving = isSubmitting || externalIsSaving;

  const handleAddTag = (tag: string) => {
    const currentTags = watchedTags || [];
    if (currentTags.length < 5 && !currentTags.includes(tag)) {
      setValue('tags', [...currentTags, tag], { shouldDirty: true });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter((t) => t !== tagToRemove), { shouldDirty: true });
  };

  const handleSetAsCover = async () => {
    if (!currentAlbum || !onSetAsCover) return;
    setIsSettingCover(true);
    try {
      await onSetAsCover(photo.url, currentAlbum.id);
    } catch {
      setLocalError('Failed to set as cover');
    } finally {
      setIsSettingCover(false);
    }
  };

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
      tags: photo.tags?.map((t) => t.tag) || [],
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
    const confirmed = await confirm(confirmDeletePhoto(photo));
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
      title="Edit photo"
      footer={
        <div className="flex gap-2 w-full">
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isSaving || isLoading}
            icon={<TrashSVG className="size-5 -ml-0.5" />}
          >
            Delete
          </Button>
          {onAddToAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAddToAlbum([photo.id])}
              icon={<FolderDownMiniSVG className="size-5 -ml-0.5" />}
            >
              Album
            </Button>
          )}
          {onRemoveFromAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onRemoveFromAlbum([photo.id])}
              icon={<CloseMiniSVG className="size-5 -ml-0.5" />}
            >
              Remove
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || isLoading || !isDirty}
            loading={isSaving}
            icon={<CheckMiniSVG className="size-5 -ml-0.5" />}
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Tags</label>
          <TagInput
            id={`tags-${photo.id}`}
            tags={watchedTags || []}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            helperText="Add up to 5 tags to help people discover your photo"
          />
        </div>

        {/* Album cover section - only show when in album context */}
        {currentAlbum && onSetAsCover && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Album cover</label>
            {isCurrentCover ? (
              <p className="text-sm text-foreground/70">
                This photo is the current cover of this album
              </p>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSetAsCover}
                loading={isSettingCover}
                disabled={isSettingCover}
                icon={<WallArtSVG className="size-4" />}
                className="self-start"
              >
                Set as album cover
              </Button>
            )}
          </div>
        )}

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
  onSetAsCover,
  currentAlbum,
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
      onSetAsCover={onSetAsCover}
      currentAlbum={currentAlbum}
      isLoading={isLoading}
      onDirtyChange={onDirtyChange}
      isDirtyRef={isDirtyRef}
      isSaving={externalIsSaving}
      externalError={externalError}
      externalSuccess={externalSuccess}
    />
  );
}
