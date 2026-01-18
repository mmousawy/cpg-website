'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import AlbumMiniCard from '@/components/album/AlbumMiniCard';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import TagInput from '@/components/shared/TagInput';
import Textarea from '@/components/shared/Textarea';
import Toggle from '@/components/shared/Toggle';
import type { PhotoWithAlbums } from '@/types/photos';
import { confirmDeletePhoto } from '@/utils/confirmHelpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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

// Re-export schema for use in other files if needed
export { photoFormSchema };

interface SinglePhotoEditFormProps {
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
}

export default function SinglePhotoEditForm({
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
}: SinglePhotoEditFormProps) {
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
  }, [photo, reset]);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save photo';
      setLocalError(message);
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
        <div
          className="flex gap-2 w-full"
        >
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isSaving || isLoading}
            icon={<TrashSVG
              className="size-5 -ml-0.5"
            />}
          >
            Delete
          </Button>
          {onAddToAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAddToAlbum([photo.id])}
              icon={<FolderDownMiniSVG
                className="size-5 -ml-0.5"
              />}
            >
              Album
            </Button>
          )}
          {onRemoveFromAlbum && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onRemoveFromAlbum([photo.id])}
              icon={<CloseMiniSVG
                className="size-5 -ml-0.5"
              />}
            >
              Remove
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || isLoading || !isDirty}
            loading={isSaving}
            icon={<CheckMiniSVG
              className="size-5 -ml-0.5"
            />}
            className="ml-auto"
          >
            {success ? 'Saved!' : 'Save'}
          </Button>
        </div>
      }
    >
      {/* Photo thumbnail */}
      <div
        className="mb-6"
      >
        <PhotoListItem
          photo={photo}
          variant="detailed"
        />
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor={`title-${photo.id}`}
            className="text-sm font-medium"
          >
            Title
          </label>
          <Input
            id={`title-${photo.id}`}
            type="text"
            {...register('title')}
            placeholder="Photo title (optional)"
          />
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor={`description-${photo.id}`}
            className="text-sm font-medium"
          >
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

        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
          >
            Tags
          </label>
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
          <div
            className="flex flex-col gap-2"
          >
            <label
              className="text-sm font-medium"
            >
              Album cover
            </label>
            {isCurrentCover ? (
              <p
                className="text-sm text-foreground/70"
              >
                This photo is the current cover of this album
              </p>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSetAsCover}
                loading={isSettingCover}
                disabled={isSettingCover}
                icon={<WallArtSVG
                  className="size-4"
                />}
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
            <hr
              className="my-4 border-border-color"
            />
            <div>
              <h3
                className="mb-2 text-sm font-medium"
              >
                Part of:
              </h3>
              <div
                className="grid grid-cols-2 gap-2"
              >
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
          <div
            className="rounded-md bg-red-500/10 p-3 text-sm text-red-500"
          >
            {error}
          </div>
        )}
      </form>
    </SidebarPanel>
  );
}
