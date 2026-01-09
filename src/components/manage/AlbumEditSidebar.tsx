'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import Button from '@/components/shared/Button';
import Toggle from '@/components/shared/Toggle';
import type { Album } from '@/types/albums';
import { createClient } from '@/utils/supabase/client';

import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import TrashSVG from 'public/icons/trash.svg';
import SidebarPanel from './SidebarPanel';

// Zod schema for album form validation
const albumFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  isPublic: z.boolean(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
});

export type AlbumFormData = z.infer<typeof albumFormSchema>

const inputClassName = "rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none w-full";

interface AlbumEditSidebarProps {
  album: Album | null;
  isNewAlbum?: boolean;
  nickname?: string | null;
  onSave: (data: AlbumFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
  /** Called when dirty state changes - parent can use this to warn before deselecting */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Ref to check if there are unsaved changes */
  isDirtyRef?: React.MutableRefObject<boolean>;
}

export default function AlbumEditSidebar({
  album,
  isNewAlbum = false,
  nickname,
  onSave,
  onDelete,
  isLoading = false,
  onDirtyChange,
  isDirtyRef,
}: AlbumEditSidebarProps) {
  const supabase = createClient();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    formState: { errors, isDirty },
  } = useForm<AlbumFormData>({
    resolver: zodResolver(albumFormSchema),
    defaultValues: formDefaultValues,
  });

  const watchedSlug = watch('slug');
  const watchedTags = watch('tags');

  // Update dirty ref and call callback when dirty state changes
  useEffect(() => {
    if (isDirtyRef) {
      isDirtyRef.current = isDirty;
    }
    onDirtyChange?.(isDirty);
  }, [isDirty, isDirtyRef, onDirtyChange]);

  // Load album data when album changes
  useEffect(() => {
    if (!album) {
      reset(formDefaultValues);
      return;
    }

    const loadAlbum = async () => {
      // Fetch tags
      const { data: tagsData } = await supabase
        .from('album_tags')
        .select('tag')
        .eq('album_id', album.id);

      const albumTags = tagsData?.map(t => t.tag) || [];

      reset({
        title: album.title,
        slug: album.slug,
        description: album.description || '',
        isPublic: album.is_public ?? true,
        tags: albumTags,
      });
    };

    loadAlbum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album?.id]);

  // Handle Delete key for album deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if in an input or textarea, or if it's a new album
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (isNewAlbum || !album || !onDelete) return;

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
    if (isNewAlbum) {
      setValue('slug', generateSlug(value), { shouldDirty: true });
    }
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
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(data);
      // Reset form to mark as not dirty after successful save
      reset(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save album');
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = await confirm({
      title: 'Delete Album',
      message: 'Are you sure you want to delete this album? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete();
    } catch (err: any) {
      setError(err.message || 'Failed to delete album');
      setIsDeleting(false);
    }
  };

  const triggerSubmit = () => {
    formRef.current?.requestSubmit();
  };

  if (isLoading) {
    return (
      <SidebarPanel title={isNewAlbum ? 'New Album' : 'Album Settings'}>
        <div className="flex items-center justify-center py-12">
          <p className="opacity-70">Loading...</p>
        </div>
      </SidebarPanel>
    );
  }

  return (
    <SidebarPanel
      title={isNewAlbum ? 'New Album' : 'Album Settings'}
      footer={
        <div className="flex gap-2 w-full">
          {!isNewAlbum && album && onDelete && (
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
            className={!isNewAlbum && album && onDelete ? 'ml-auto' : ''}
            fullWidth={isNewAlbum || !album || !onDelete}
          >
            {success ? 'Saved!' : isNewAlbum ? 'Create Album' : 'Save'}
          </Button>
        </div>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title *
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={`${inputClassName} ${errors.title ? 'border-red-500' : ''}`}
            placeholder="My Amazing Photo Album"
          />
          {errors.title && (
            <p className="text-xs text-red-500">{errors.title.message}</p>
          )}
          <p className="text-xs text-foreground/50">
            URL: {process.env.NEXT_PUBLIC_SITE_URL}/@{nickname || 'your-nickname'}/album/{watchedSlug || 'your-title'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            className={inputClassName}
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
                    <CloseSVG className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.tags && (
            <p className="text-xs text-red-500">{errors.tags.message}</p>
          )}
          <input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            disabled={(watchedTags?.length || 0) >= 5}
            onKeyDown={handleAddTag}
            className={`${inputClassName} disabled:opacity-50`}
            placeholder={(watchedTags?.length || 0) >= 5 ? 'Maximum of 5 tags reached' : 'Type a tag and press Enter'}
          />
          <p className="text-xs text-foreground/50">
            Add up to 5 tags to help people discover your album
          </p>
        </div>

        {/* Status messages */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </form>
    </SidebarPanel>
  );
}
