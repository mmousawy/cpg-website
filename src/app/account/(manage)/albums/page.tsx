'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import {
  AlbumEditEmptyState,
  AlbumEditSidebar,
  AlbumGrid,
  type AlbumFormData,
  type BulkAlbumFormData,
} from '@/components/manage';
import ManageLayout from '@/components/manage/ManageLayout';
import Button from '@/components/shared/Button';
import PageLoading from '@/components/shared/PageLoading';
import { useManage } from '@/context/ManageContext';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';
import { useAuth } from '@/hooks/useAuth';
import type { AlbumWithPhotos } from '@/types/albums';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import PlusSVG from 'public/icons/plus.svg';

export default function AlbumsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { refreshCounts } = useManage();
  const confirm = useConfirm();

  const albumEditDirtyRef = useRef(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // Sync dirty state with global unsaved changes context
  const handleDirtyChange = useCallback((isDirty: boolean) => {
    albumEditDirtyRef.current = isDirty;
    setHasUnsavedChanges(isDirty);
  }, [setHasUnsavedChanges]);

  // Clear unsaved changes on unmount
  useEffect(() => {
    return () => setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const confirmUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (!albumEditDirtyRef.current) return true;
    const confirmed = await confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Are you sure you want to leave without saving?',
      confirmLabel: 'Leave',
      variant: 'danger',
    });
    if (confirmed) {
      albumEditDirtyRef.current = false;
      setHasUnsavedChanges(false);
    }
    return confirmed;
  }, [confirm, setHasUnsavedChanges]);

  // State
  const [albums, setAlbums] = useState<AlbumWithPhotos[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [isNewAlbum, setIsNewAlbum] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    fetchAlbums(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAlbums = async (showLoading = false) => {
    if (!user) return;

    if (showLoading || albums.length === 0) {
      setAlbumsLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          description,
          slug,
          cover_image_url,
          is_public,
          created_at,
          user_id,
          photos:album_photos(id, photo_url),
          tags:album_tags(tag)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching albums:', error);
      } else {
        setAlbums((data || []) as unknown as AlbumWithPhotos[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setAlbumsLoading(false);
  };

  const handleAlbumDoubleClick = async (album: AlbumWithPhotos) => {
    if (!(await confirmUnsavedChanges())) return;
    router.push(`/account/albums/${album.slug}`);
  };

  const handleSelectAlbum = (albumId: string, isMultiSelect: boolean) => {
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(albumId)) {
          newSet.delete(albumId);
        } else {
          newSet.add(albumId);
        }
      } else {
        newSet.clear();
        newSet.add(albumId);
      }
      return newSet;
    });
  };

  const handleClearSelection = async () => {
    if (albumEditDirtyRef.current && !(await confirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set());
  };

  const handleSelectMultiple = async (ids: string[]) => {
    if (albumEditDirtyRef.current && !(await confirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set(ids));
  };

  const handleCreateNewAlbum = async () => {
    if (!(await confirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set());
    setIsNewAlbum(true);
  };

  const handleCreateAlbum = async (data: AlbumFormData) => {
    if (!user) return;

    const { data: newAlbum, error: createError } = await supabase
      .from('albums')
      .insert({
        user_id: user.id,
        title: data.title.trim(),
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        is_public: data.isPublic,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(createError.message || 'Failed to create album');
    }

    // Add tags for new album
    if (data.tags.length > 0 && newAlbum) {
      await supabase
        .from('album_tags')
        .insert(data.tags.map(tag => ({
          album_id: newAlbum.id,
          tag: tag.toLowerCase(),
        })));
    }

    await fetchAlbums();
    refreshCounts();
    setIsNewAlbum(false);
    // Navigate to the new album
    router.push(`/account/albums/${newAlbum.slug}`);
  };

  const handleSaveAlbum = async (albumId: string, data: AlbumFormData) => {
    if (!user) return;

    const { error: updateError } = await supabase
      .from('albums')
      .update({
        title: data.title.trim(),
        slug: data.slug.trim(),
        description: data.description?.trim() || null,
        is_public: data.isPublic,
      })
      .eq('id', albumId)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update album');
    }

    // Update tags
    await supabase.from('album_tags').delete().eq('album_id', albumId);
    if (data.tags.length > 0) {
      await supabase.from('album_tags').insert(
        data.tags.map((tag) => ({ album_id: albumId, tag: tag.toLowerCase() })),
      );
    }

    await fetchAlbums();
    refreshCounts();
  };

  const handleBulkSaveAlbums = async (albumIds: string[], data: BulkAlbumFormData) => {
    if (!user) return;

    try {
      const updates: { is_public?: boolean } = {};

      // Update visibility if provided
      if (data.isPublic !== null) {
        updates.is_public = data.isPublic;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('albums')
          .update(updates)
          .in('id', albumIds)
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error(updateError.message || 'Failed to update albums');
        }
      }

      // Add tags if provided
      if (data.tags && data.tags.length > 0) {
        // Get existing tags for each album and merge
        const { data: existingTags } = await supabase
          .from('album_tags')
          .select('album_id, tag')
          .in('album_id', albumIds);

        const tagsByAlbum = new Map<string, Set<string>>();
        existingTags?.forEach(({ album_id, tag }) => {
          if (!tagsByAlbum.has(album_id)) {
            tagsByAlbum.set(album_id, new Set());
          }
          tagsByAlbum.get(album_id)!.add(tag);
        });

        // Add new tags to each album (up to 5 total)
        const tagInserts: { album_id: string; tag: string }[] = [];
        albumIds.forEach((albumId) => {
          const existing = tagsByAlbum.get(albumId) || new Set();
          data.tags!.forEach((tag) => {
            const currentInserts = tagInserts.filter((t) => t.album_id === albumId).length;
            if (!existing.has(tag) && existing.size + currentInserts < 5) {
              tagInserts.push({ album_id: albumId, tag: tag.toLowerCase() });
            }
          });
        });

        if (tagInserts.length > 0) {
          const { error: tagError } = await supabase
            .from('album_tags')
            .insert(tagInserts);

          if (tagError) {
            throw new Error(tagError.message || 'Failed to add tags');
          }
        }
      }

      await fetchAlbums();
      refreshCounts();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save albums');
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!user) return;

    const album = albums.find((a) => a.id === albumId);
    if (!album) return;

    // Use atomic RPC function to delete album and all related data
    const { data: success, error } = await supabase.rpc('delete_album', {
      p_album_id: albumId,
    });

    if (error || !success) {
      throw new Error(error?.message || 'Failed to delete album');
    }

    // Clear selection if deleting a selected album
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(albumId);
      return newSet;
    });

    await fetchAlbums();
    refreshCounts();
  };

  const handleBulkDeleteAlbums = async (albumIds: string[]) => {
    if (!user || albumIds.length === 0) return;

    // Delete albums one by one using the RPC function
    for (const albumId of albumIds) {
      const { data: success, error } = await supabase.rpc('delete_album', {
        p_album_id: albumId,
      });

      if (error || !success) {
        throw new Error(error?.message || `Failed to delete album ${albumId}`);
      }
    }

    setSelectedAlbumIds(new Set());
    await fetchAlbums();
    refreshCounts();
  };

  const selectedAlbums = albums.filter((a) => selectedAlbumIds.has(a.id));

  return (
    <ManageLayout
      actions={
        <Button
          onClick={handleCreateNewAlbum}
          icon={<PlusSVG className="size-5 -ml-0.5" />}
          variant="primary"
        >
          New Album
        </Button>
      }
      sidebar={
        isNewAlbum ? (
          <AlbumEditSidebar
            selectedAlbums={[]}
            isNewAlbum={true}
            nickname={profile?.nickname}
            onSave={handleSaveAlbum}
            onBulkSave={handleBulkSaveAlbums}
            onDelete={handleDeleteAlbum}
            onBulkDelete={handleBulkDeleteAlbums}
            onCreate={handleCreateAlbum}
            onDirtyChange={handleDirtyChange}
          />
        ) : selectedAlbums.length > 0 ? (
          <AlbumEditSidebar
            selectedAlbums={selectedAlbums}
            nickname={profile?.nickname}
            onSave={handleSaveAlbum}
            onBulkSave={handleBulkSaveAlbums}
            onDelete={handleDeleteAlbum}
            onBulkDelete={handleBulkDeleteAlbums}
            isLoading={albumsLoading}
            onDirtyChange={handleDirtyChange}
          />
        ) : (
          <AlbumEditEmptyState />
        )
      }
    >
      {albumsLoading ? (
        <PageLoading message="Loading albums..." />
      ) : albums.length === 0 && !isNewAlbum ? (
        <div className="rounded-lg border-2 border-dashed border-border-color p-12 text-center">
          <p className="mb-4 text-lg opacity-70">No albums yet</p>
          <Button onClick={handleCreateNewAlbum} icon={<PlusSVG className="size-5 -ml-0.5" />}>
            Create your first album
          </Button>
        </div>
      ) : (
        <AlbumGrid
          albums={albums}
          selectedAlbumIds={selectedAlbumIds}
          onAlbumDoubleClick={handleAlbumDoubleClick}
          onSelectAlbum={handleSelectAlbum}
          onClearSelection={handleClearSelection}
          onSelectMultiple={handleSelectMultiple}
        />
      )}
    </ManageLayout>
  );
}
