'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import Button from '@/components/shared/Button';
import type { Album } from '@/types/albums';
import { createClient } from '@/utils/supabase/client';

import CloseSVG from 'public/icons/close.svg';
import TrashSVG from 'public/icons/trash.svg';

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
}

export default function AlbumEditSidebar({
  album,
  isNewAlbum = false,
  nickname,
  onSave,
  onDelete,
  isLoading = false,
}: AlbumEditSidebarProps) {
  const supabase = createClient();
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
        isPublic: album.is_public,
        tags: albumTags,
      });
    };

    loadAlbum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album?.id]);

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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save album');
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete();
    } catch (err: any) {
      setError(err.message || 'Failed to delete album');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="opacity-70">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="mb-6 text-lg font-semibold">
        {isNewAlbum ? 'New Album' : 'Album Settings'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div className="flex items-center">
          <input
            id="isPublic"
            type="checkbox"
            {...register('isPublic')}
            className="size-4 rounded border-neutral-300 text-blue-600"
          />
          <label htmlFor="isPublic" className="ml-2 text-sm">
            Make this album public
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="tags" className="text-sm font-medium">
            Tags
          </label>
          {watchedTags && watchedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {watchedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="rounded-full bg-background-light/70 hover:bg-background-light font-bold text-foreground size-5 flex items-center justify-center -mr-2 ml-1"
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
        {success && (
          <p className="text-sm text-green-500">Album saved successfully!</p>
        )}

        {/* Save button */}
        <Button
          type="submit"
          disabled={isSaving || (!isNewAlbum && !isDirty)}
          loading={isSaving}
          fullWidth
        >
          {isNewAlbum ? 'Create Album' : 'Save Changes'}
        </Button>
      </form>

      {/* Danger zone */}
      {!isNewAlbum && album && onDelete && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <h3 className="mb-2 font-semibold text-red-600">Danger zone</h3>
          <p className="mb-4 text-sm text-foreground/70">
            Once you delete an album, there is no going back. This will permanently delete the album and all associated photos and tags.
          </p>
          <Button
            onClick={handleDelete}
            variant="danger"
            icon={<TrashSVG className="h-4 w-4" />}
            disabled={isDeleting}
            fullWidth
          >
            {isDeleting ? 'Deleting...' : 'Delete album'}
          </Button>
        </div>
      )}
    </div>
  );
}

