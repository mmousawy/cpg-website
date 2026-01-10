'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Textarea from '@/components/shared/Textarea';
import Toggle from '@/components/shared/Toggle';
import type { AlbumWithPhotos } from '@/types/albums';
import { zodResolver } from '@hookform/resolvers/zod';
import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import TrashSVG from 'public/icons/trash.svg';
import WarningMicroSVG from 'public/icons/warning-micro.svg';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import AlbumEditEmptyState from './AlbumEditEmptyState';
import AlbumListItem from './AlbumListItem';
import SidebarPanel from './SidebarPanel';

// Zod schema for album form validation
const albumFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').max(50, 'Slug must be less than 50 characters'),
  description: z.string().optional(),
  isPublic: z.boolean(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
});

export type AlbumFormData = z.infer<typeof albumFormSchema>;

// Bulk edit schema - visibility and tags only (description doesn't make sense for bulk)
const bulkAlbumFormSchema = z.object({
  isPublic: z.boolean().nullable(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional(),
});

export type BulkAlbumFormData = z.infer<typeof bulkAlbumFormSchema>;

interface AlbumEditSidebarProps {
  selectedAlbums: AlbumWithPhotos[];
  /** Set to true when creating a new album (shows empty form) */
  isNewAlbum?: boolean;
  nickname?: string | null;
  onSave: (albumId: string, data: AlbumFormData) => Promise<void>;
  onBulkSave?: (albumIds: string[], data: BulkAlbumFormData) => Promise<void>;
  onDelete: (albumId: string) => Promise<void>;
  onBulkDelete?: (albumIds: string[]) => Promise<void>;
  /** Handler for creating a new album */
  onCreate?: (data: AlbumFormData) => Promise<void>;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  isDirtyRef?: React.MutableRefObject<boolean>;
  isSaving?: boolean;
  externalError?: string | null;
  externalSuccess?: boolean;
}

/** Bulk edit form for multiple albums */
function BulkAlbumEditForm({
  selectedAlbums,
  onBulkSave,
  onDelete,
  onBulkDelete,
  isLoading,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
}: {
  selectedAlbums: AlbumWithPhotos[];
  onBulkSave?: (albumIds: string[], data: BulkAlbumFormData) => Promise<void>;
  onDelete: (albumId: string) => Promise<void>;
  onBulkDelete?: (albumIds: string[]) => Promise<void>;
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
  const [tagInput, setTagInput] = useState('');

  // Check if all albums have the same is_public value
  const allPublic = selectedAlbums.every((a) => a.is_public);
  const allPrivate = selectedAlbums.every((a) => !a.is_public);
  const mixedVisibility = !allPublic && !allPrivate;

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<BulkAlbumFormData>({
    resolver: zodResolver(bulkAlbumFormSchema),
    defaultValues: {
      isPublic: mixedVisibility ? null : allPublic,
      tags: [],
    },
  });

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

  // Handle Delete key for bulk deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      const currentTags = watchedTags || [];

      if (currentTags.length < 5 && !currentTags.includes(newTag)) {
        setValue('tags', [...currentTags, newTag], { shouldDirty: true });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter((tag) => tag !== tagToRemove), { shouldDirty: true });
  };

  const onSubmit = async (data: BulkAlbumFormData) => {
    if (!onBulkSave) {
      setLocalError('Bulk save not supported');
      return;
    }

    setLocalError(null);
    setLocalSuccess(false);

    try {
      const albumIds = selectedAlbums.map((a) => a.id);
      await onBulkSave(albumIds, data);
      reset(data);
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save albums');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedAlbums.length;

    const confirmed = await confirm({
      title: 'Delete Albums',
      message: `Are you sure you want to delete ${count} album${count !== 1 ? 's' : ''}? This action cannot be undone.`,
      content: (
        <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
          {selectedAlbums.map((album) => (
            <AlbumListItem key={album.id} album={album} variant="detailed" />
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
        const albumIds = selectedAlbums.map((a) => a.id);
        await onBulkDelete(albumIds);
      } else {
        for (const album of selectedAlbums) {
          await onDelete(album.id);
        }
      }
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete albums');
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
      title={`Edit ${selectedAlbums.length} albums`}
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
      {/* Selected albums list */}
      <div className="mb-6 max-h-48 space-y-1 overflow-y-auto">
        {selectedAlbums.map((album) => (
          <AlbumListItem key={album.id} album={album} variant="detailed" />
        ))}
      </div>

      {/* Bulk edit form */}
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Toggle
            id="bulk_isPublic"
            leftLabel="Private"
            rightLabel="Public"
            checked={watchedIsPublic ?? (mixedVisibility ? false : allPublic)}
            onChange={(e) => {
              setValue('isPublic', e.target.checked, { shouldDirty: true });
            }}
            label="Visibility"
          />
          {mixedVisibility && watchedIsPublic === null && (
            <span className="text-xs text-foreground/50">(currently mixed)</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="bulk_tags" className="text-sm font-medium">
            Add Tags
          </label>
          {watchedTags && watchedTags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {watchedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="-mr-2 ml-1 flex size-5 items-center justify-center rounded-full bg-background-light/70 font-bold text-foreground hover:bg-background-light"
                    aria-label="Remove tag"
                  >
                    <CloseSVG className="size-3.5 fill-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Input
            id="bulk_tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            disabled={(watchedTags?.length || 0) >= 5}
            onKeyDown={handleAddTag}
            placeholder={(watchedTags?.length || 0) >= 5 ? 'Maximum of 5 tags reached' : 'Type a tag and press Enter'}
          />
          <p className="text-xs text-foreground/50">
            Tags will be added to existing tags on each album
          </p>
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

/** Single album edit form */
function SingleAlbumEditForm({
  album,
  isNewAlbum,
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
}: {
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
}) {
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [tagInput, setTagInput] = useState('');
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

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      const currentTags = watchedTags || [];

      if (currentTags.length < 5 && !currentTags.includes(newTag)) {
        setValue('tags', [...currentTags, newTag], { shouldDirty: true });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter(tag => tag !== tagToRemove), { shouldDirty: true });
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

    const confirmed = await confirm({
      title: 'Delete Album',
      message: 'Are you sure you want to delete this album? This action cannot be undone.',
      content: (
        <AlbumListItem album={album} variant="compact" />
      ),
      confirmLabel: 'Delete',
      variant: 'danger',
    });

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
      <SidebarPanel title={isNewAlbum ? 'New album' : 'Edit album'}>
        <div className="flex items-center justify-center py-12">
          <p className="opacity-70">Loading...</p>
        </div>
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel
      title={isNewAlbum ? 'New album' : 'Edit album'}
      footer={
        <div className="flex gap-2 w-full">
          {!isNewAlbum && album && (
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
              loading={isDeleting}
              icon={<TrashSVG className="size-4 -ml-0.5" />}
            >
              Delete
            </Button>
          )}
          <Button
            onClick={triggerSubmit}
            disabled={isSaving || (!isNewAlbum && !isDirty)}
            loading={isSaving}
            icon={<CheckSVG className="size-4 -ml-0.5" />}
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
        <div className="mb-6">
          <AlbumListItem album={album} variant="detailed" />
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium">
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
          {errors.title && (
            <p className="text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="slug" className="text-sm font-medium">
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
          {errors.slug && (
            <p className="text-xs text-red-500">{errors.slug.message}</p>
          )}
          {!isNewAlbum && hasEditedSlug && (
            <p className="text-xs text-amber-600 dark:text-amber-500">
              <WarningMicroSVG className="size-4 fill-amber-600 dark:fill-amber-500 inline-block" /> Changing the slug will change the album URL. If you&apos;ve already shared the URL, you&apos;ll need to update your links.
            </p>
          )}
          <p className="text-xs text-foreground/50">
            URL: {process.env.NEXT_PUBLIC_SITE_URL}/@{nickname || 'your-nickname'}/album/{watchedSlug || 'your-slug'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium">
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

        <div className="flex flex-col gap-2">
          <label htmlFor="tags" className="text-sm font-medium">
            Tags
          </label>
          {watchedTags && watchedTags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {watchedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="-mr-2 ml-1 flex size-5 items-center justify-center rounded-full bg-background-light/70 font-bold text-foreground hover:bg-background-light"
                    aria-label="Remove tag"
                  >
                    <CloseSVG className="size-3.5 fill-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.tags && (
            <p className="text-xs text-red-500">{errors.tags.message}</p>
          )}
          <Input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            disabled={(watchedTags?.length || 0) >= 5}
            onKeyDown={handleAddTag}
            placeholder={(watchedTags?.length || 0) >= 5 ? 'Maximum of 5 tags reached' : 'Type a tag and press Enter'}
          />
          <p className="text-xs text-foreground/50">
            Add up to 5 tags to help people discover your album
          </p>
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

export default function AlbumEditSidebar({
  selectedAlbums,
  isNewAlbum = false,
  nickname,
  onSave,
  onBulkSave,
  onDelete,
  onBulkDelete,
  onCreate,
  isLoading = false,
  onDirtyChange,
  isDirtyRef,
  isSaving: externalIsSaving = false,
  externalError = null,
  externalSuccess = false,
}: AlbumEditSidebarProps) {
  const album = selectedAlbums[0] || null;
  const isMultiple = selectedAlbums.length > 1;

  // New album mode
  if (isNewAlbum) {
    return (
      <SingleAlbumEditForm
        album={null}
        isNewAlbum={true}
        nickname={nickname}
        onSave={onSave}
        onDelete={onDelete}
        onCreate={onCreate}
        isLoading={isLoading}
        onDirtyChange={onDirtyChange}
        isDirtyRef={isDirtyRef}
        isSaving={externalIsSaving}
        externalError={externalError}
        externalSuccess={externalSuccess}
      />
    );
  }

  // No albums selected
  if (!album) {
    return (
      <SidebarPanel>
        <AlbumEditEmptyState />
      </SidebarPanel>
    );
  }

  // Multiple albums - bulk edit mode
  if (isMultiple) {
    return (
      <BulkAlbumEditForm
        selectedAlbums={selectedAlbums}
        onBulkSave={onBulkSave}
        onDelete={onDelete}
        onBulkDelete={onBulkDelete}
        isLoading={isLoading}
        onDirtyChange={onDirtyChange}
        isDirtyRef={isDirtyRef}
        isSaving={externalIsSaving}
        externalError={externalError}
        externalSuccess={externalSuccess}
      />
    );
  }

  // Single album mode
  return (
    <SingleAlbumEditForm
      album={album}
      nickname={nickname}
      onSave={onSave}
      onDelete={onDelete}
      isLoading={isLoading}
      onDirtyChange={onDirtyChange}
      isDirtyRef={isDirtyRef}
      isSaving={externalIsSaving}
      externalError={externalError}
      externalSuccess={externalSuccess}
    />
  );
}
