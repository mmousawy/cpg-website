'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import Button from '@/components/shared/Button';
import TagInput from '@/components/shared/TagInput';
import Toggle from '@/components/shared/Toggle';
import { useAuth } from '@/hooks/useAuth';
import type { AlbumWithPhotos } from '@/types/albums';
import { confirmDeleteAlbums } from '@/utils/confirmHelpers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import AlbumListItem from './AlbumListItem';
import SidebarPanel from './SidebarPanel';

import CheckMiniSVG from 'public/icons/check-mini.svg';
import TrashSVG from 'public/icons/trash.svg';

// Bulk edit schema - visibility and tags only (description doesn't make sense for bulk)
const bulkAlbumFormSchema = z.object({
  isPublic: z.boolean().nullable(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed').optional(),
  // Original common tags when form was loaded - used to determine which tags were removed
  originalCommonTags: z.array(z.string()).optional(),
});

export type BulkAlbumFormData = z.infer<typeof bulkAlbumFormSchema>;

// Re-export schema for use in other files if needed
export { bulkAlbumFormSchema };

interface BulkAlbumEditFormProps {
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
  /** Hide title (when shown in parent container like BottomSheet) */
  hideTitle?: boolean;
}

export default function BulkAlbumEditForm({
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
  hideTitle = false,
}: BulkAlbumEditFormProps) {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if all albums have the same is_public value
  const allPublic = selectedAlbums.every((a) => a.is_public);
  const allPrivate = selectedAlbums.every((a) => !a.is_public);
  const mixedVisibility = !allPublic && !allPrivate;

  // Find tags that are common across ALL selected albums
  const getCommonTags = (albums: AlbumWithPhotos[]): string[] => {
    if (albums.length === 0) return [];

    const tagSets = albums.map((a) => {
      const tags = a.tags?.map((t) => (typeof t === 'string' ? t : t.tag).toLowerCase()) || [];
      return new Set(tags);
    });

    if (tagSets.length === 0) return [];

    // Start with tags from first album, then intersect with others
    const commonTags = Array.from(tagSets[0]).filter((tag) =>
      tagSets.every((tagSet) => tagSet.has(tag)),
    );

    return commonTags.sort();
  };

  // Calculate tag counts across all selected albums
  const getTagCounts = (albums: AlbumWithPhotos[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    albums.forEach((album) => {
      const tags = album.tags?.map((t) => (typeof t === 'string' ? t : t.tag).toLowerCase()) || [];
      tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  };

  const commonTags = getCommonTags(selectedAlbums);
  const tagCounts = getTagCounts(selectedAlbums);
  // Get all unique tags sorted by count (descending), then alphabetically (for display only)
  const allTags = Object.keys(tagCounts).sort((a, b) => {
    const countDiff = tagCounts[b] - tagCounts[a];
    if (countDiff !== 0) return countDiff;
    return a.localeCompare(b);
  });

  const {
    control,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<BulkAlbumFormData>({
    resolver: zodResolver(bulkAlbumFormSchema),
    defaultValues: {
      isPublic: mixedVisibility ? null : allPublic,
      tags: commonTags, // Only include fully shared tags in form
    },
  });

  const watchedTags = useWatch({ control, name: 'tags' });
  const watchedIsPublic = useWatch({ control, name: 'isPublic' });
  const isSaving = isSubmitting || externalIsSaving;

  // Memoize album IDs string for dependency - only reset form when actual selection changes
  const albumIdsKey = useMemo(() => selectedAlbums.map((a) => a.id).join(','), [selectedAlbums]);

  // Reset form when selection changes to update tags (only common tags)
  // Only depend on albumIdsKey to avoid resetting on every parent re-render
  useEffect(() => {
    const albums = selectedAlbums;
    const newCommonTags = getCommonTags(albums);
    const newAllPublic = albums.every((a) => a.is_public);
    const newAllPrivate = albums.every((a) => !a.is_public);
    const newMixedVisibility = !newAllPublic && !newAllPrivate;
    reset({
      isPublic: newMixedVisibility ? null : newAllPublic,
      tags: newCommonTags, // Only reset to common tags
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumIdsKey, reset]);

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

  const onSubmit = async (data: BulkAlbumFormData) => {
    if (!onBulkSave) {
      setLocalError('Bulk save not supported');
      return;
    }

    setLocalError(null);
    setLocalSuccess(false);

    try {
      const albumIds = selectedAlbums.map((a) => a.id);
      // Include original common tags so mutation knows which tags were removed vs partially shared
      await onBulkSave(albumIds, { ...data, originalCommonTags: commonTags });
      reset(data);
      setLocalSuccess(true);
      setTimeout(() => setLocalSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save albums';
      setLocalError(message);
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm(confirmDeleteAlbums(selectedAlbums));
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete albums';
      setLocalError(message);
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
      hideTitle={hideTitle}
      footer={
        <div
          className="flex gap-2 w-full"
        >
          <Button
            type="button"
            variant="danger"
            onClick={handleBulkDelete}
            disabled={isSaving || isLoading || isDeleting}
            loading={isDeleting}
            icon={<TrashSVG
              className="size-4 -ml-0.5"
            />}
          >
            Delete
          </Button>
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
      {/* Selected albums list */}
      <div
        className="mb-6 max-h-48 space-y-1 overflow-y-auto"
      >
        {selectedAlbums.map((album) => (
          <AlbumListItem
            key={album.id}
            album={album}
            variant="detailed"
            publicUrl={profile?.nickname ? `/@${profile.nickname}/album/${album.slug}` : undefined}
          />
        ))}
      </div>

      {/* Bulk edit form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div
          className="flex flex-col gap-2"
        >
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
            <span
              className="text-xs text-foreground/50"
            >
              (currently mixed)
            </span>
          )}
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            className="text-sm font-medium"
          >
            Tags
          </label>
          <TagInput
            id="bulk_tags"
            tags={watchedTags || []}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            tagCounts={tagCounts}
            totalCount={selectedAlbums.length}
            readOnlyTags={allTags.filter((tag) => !commonTags.includes(tag))}
            helperText="Partially shared tags are visible but are not editable and won't be added to other items."
          />
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
