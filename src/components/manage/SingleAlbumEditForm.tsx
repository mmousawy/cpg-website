'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import TagInput from '@/components/shared/TagInput';
import Textarea from '@/components/shared/Textarea';
import Toggle from '@/components/shared/Toggle';
import type { AlbumWithPhotos } from '@/types/albums';
import { confirmDeleteAlbum } from '@/utils/confirmHelpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import AlbumListItem from './AlbumListItem';
import SidebarPanel from './SidebarPanel';

import CheckMiniSVG from 'public/icons/check-mini.svg';
import TrashSVG from 'public/icons/trash.svg';
import WarningMicroSVG from 'public/icons/warning-micro.svg';

// Zod schema for album form validation
const albumFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').max(50, 'Slug must be less than 50 characters'),
  description: z.string().optional(),
  isPublic: z.boolean(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
});

export type AlbumFormData = z.infer<typeof albumFormSchema>;

// Re-export schema for use in other files if needed
export { albumFormSchema };

interface SingleAlbumEditFormProps {
  album: AlbumWithPhotos | null;
  isNewAlbum?: boolean;
  nickname?: string | null;
  onSave: (albumId: string, data: AlbumFormData) => Promise<void>;
  onDelete: (albumId: string) => Promise<void>;
  onCreate?: (data: AlbumFormData) => Promise<void>;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isDirtyRef?: React.MutableRefObject<boolean>;
  isSaving?: boolean;
  externalError?: string | null;
  externalSuccess?: boolean;
}

export default function SingleAlbumEditForm({
  album,
  isNewAlbum = false,
  nickname,
  onSave,
  onDelete,
  onCreate,
  isLoading,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
}: SingleAlbumEditFormProps) {
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasEditedSlug, setHasEditedSlug] = useState(false);

  const formDefaultValues: AlbumFormData = {
    title: '',
    slug: '',
    description: '',
    isPublic: true,
    tags: [],
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: formDefaultValues,
  });

  const watchedSlug = watch('slug');
  const watchedTags = watch('tags');
  const watchedIsPublic = watch('isPublic');
  const isSaving = isSubmitting || externalIsSaving;

  // Update dirty ref and call callback when dirty state changes
  useEffect(() => {
    if (isDirtyRef) {
      isDirtyRef.current = isDirty;
    }
    onDirtyChange?.(isDirty);
  }, [isDirty, isDirtyRef, onDirtyChange]);

  // Load album data when album changes (tags are pre-fetched)
  useEffect(() => {
    if (!album || isNewAlbum) {
      reset(formDefaultValues);
      setHasEditedSlug(false);
      return;
    }

    // Use pre-fetched tags from album data
    const albumTags = album.tags?.map((t: any) => t.tag || t) || [];

    reset({
      title: album.title,
      slug: album.slug,
      description: album.description || '',
      isPublic: album.is_public ?? true,
      tags: albumTags,
    });
    setHasEditedSlug(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album?.id, isNewAlbum]);

  // Handle Delete key for album deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (isNewAlbum || !album) return;

      if (e.key === 'Delete' && !isSaving && !isDeleting) {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setValue('title', value, { shouldDirty: true });
    // Auto-generate slug from title only if creating new album and slug hasn't been manually edited
    if (isNewAlbum && !hasEditedSlug) {
      setValue('slug', generateSlug(value), { shouldDirty: false });
    }
  };

  const handleSlugChange = (value: string) => {
    // Convert spaces to hyphens, then only allow lowercase letters, numbers, and hyphens
    const sanitized = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setValue('slug', sanitized, { shouldDirty: true });
    setHasEditedSlug(true);
  };

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

  const onSubmit = async (data: AlbumFormData) => {
    setLocalError(null);
    setLocalSuccess(false);

    try {
      if (isNewAlbum && onCreate) {
        await onCreate(data);
      } else if (album) {
        await onSave(album.id, data);
        reset(data);
        setLocalSuccess(true);
        setTimeout(() => setLocalSuccess(false), 3000);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save album');
    }
  };

  const handleDelete = async () => {
    if (!album) return;

    const confirmed = await confirm(confirmDeleteAlbum(album));
    if (!confirmed) return;

    setIsDeleting(true);
    setLocalError(null);

    try {
      await onDelete(album.id);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete album');
      setIsDeleting(false);
    }
  };

  const triggerSubmit = () => {
    formRef.current?.requestSubmit();
  };

  const error = externalError || localError;
  const success = externalSuccess || localSuccess;

  if (isLoading) {
    return (
      <SidebarPanel
        title={isNewAlbum ? 'New album' : 'Edit album'}
      >
        <div
          className="flex items-center justify-center py-12"
        >
          <p
            className="opacity-70"
          >
            Loading...
          </p>
        </div>
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel
      title={isNewAlbum ? 'New album' : 'Edit album'}
      footer={
        <div
          className="flex gap-2 w-full"
        >
          {!isNewAlbum && album && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              loading={isDeleting}
              icon={<TrashSVG
                className="size-4 -ml-0.5"
              />}
            >
              Delete
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || (!isNewAlbum && !isDirty)}
            loading={isSaving}
            icon={<CheckMiniSVG
              className="size-5 -ml-0.5"
            />}
            className={!isNewAlbum && album ? 'ml-auto' : ''}
            fullWidth={isNewAlbum || !album}
          >
            {success ? 'Saved!' : isNewAlbum ? 'Create Album' : 'Save'}
          </Button>
        </div>
      }
    >
      {/* Album preview (only for existing albums) */}
      {!isNewAlbum && album && (
        <div
          className="mb-6"
        >
          <AlbumListItem
            album={album}
            variant="detailed"
          />
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="title"
            className="text-sm font-medium"
          >
            Title *
          </label>
          <Input
            id="title"
            type="text"
            {...register('title')}
            onChange={(e) => handleTitleChange(e.target.value)}
            error={!!errors.title}
            placeholder="My Amazing Photo Album"
          />
          {errors.title && <p
            className="text-xs text-red-500"
          >
            {errors.title.message}
          </p>}
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="slug"
            className="text-sm font-medium"
          >
            URL Slug *
          </label>
          <Input
            id="slug"
            type="text"
            maxLength={50}
            {...register('slug')}
            onChange={(e) => handleSlugChange(e.target.value)}
            onKeyDown={(e) => {
              // Prevent non-allowed characters from being typed
              const key = e.key;
              // Allow: letters, numbers, hyphens, spaces, backspace, delete, arrow keys, tab, etc.
              if (key.length === 1 && !/^[a-z0-9-\s]$/.test(key.toLowerCase())) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              // Sanitize pasted content
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text');
              const sanitized = pastedText.toLowerCase().replace(/[^a-z0-9-]/g, '');
              handleSlugChange(sanitized);
            }}
            error={!!errors.slug}
            mono
            placeholder="my-album-slug"
          />
          {errors.slug && <p
            className="text-xs text-red-500"
          >
            {errors.slug.message}
          </p>}
          {!isNewAlbum && hasEditedSlug && (
            <p
              className="text-xs text-amber-600 dark:text-amber-500"
            >
              <WarningMicroSVG
                className="size-4 fill-amber-600 dark:fill-amber-500 inline-block"
              />
              {' '}
              Changing the slug will change the album URL. If you&apos;ve already shared the URL,
              you&apos;ll need to update your links.
            </p>
          )}
          <p
            className="text-xs text-foreground/50"
          >
            URL:
            <br />
            <span
              className="break-words"
            >
              {(() => {
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
                const url = `${baseUrl}/@${nickname || 'your-nickname'}/album/${watchedSlug || 'your-slug'}`;
                return url.replace(/^https?:\/\//, '');
              })()}
            </span>
          </p>
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="description"
            className="text-sm font-medium"
          >
            Description
          </label>
          <Textarea
            id="description"
            {...register('description')}
            rows={4}
            placeholder="Tell us about this album..."
          />
        </div>

        <Toggle
          id="isPublic"
          leftLabel="Private"
          rightLabel="Public"
          {...register('isPublic')}
          label="Visibility"
        />
        {watchedIsPublic === false && (
          <p
            className="text-xs text-amber-600 dark:text-amber-500"
          >
            <WarningMicroSVG
              className="size-4 fill-amber-600 dark:fill-amber-500 inline-block"
            />
            {' '}
            Making an album private doesn&apos;t make photos inside it private. Set individual photos
            to private if needed.
          </p>
        )}

        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
          >
            Tags
          </label>
          <TagInput
            id="tags"
            tags={watchedTags || []}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            helperText="Add up to 5 tags to help people discover your album"
          />
          {errors.tags && <p
            className="text-xs text-red-500"
          >
            {errors.tags.message}
          </p>}
        </div>

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
