'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import {
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

import FolderSVG from 'public/icons/folder.svg';
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
          photos:album_photos(
            id,
            photo_url,
            photo:photos!album_photos_photo_id_fkey(deleted_at)
          ),
          tags:album_tags(tag)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching albums:', error);
      } else {
        // Filter out deleted photos from albums
        const albumsWithFilteredPhotos = ((data || []) as any[]).map((album) => ({
          ...album,
          photos: (album.photos || []).filter((ap: any) => !ap.photo?.deleted_at),
        }));
        setAlbums(albumsWithFilteredPhotos as unknown as AlbumWithPhotos[]);
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

  const handleSelectAlbum = async (albumId: string, isMultiSelect: boolean) => {
    // Check for unsaved changes when switching to a different single selection
    if (!isMultiSelect && albumEditDirtyRef.current && !(await confirmUnsavedChanges())) {
      return;
    }
    // Close new album form when selecting an existing album
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
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
    // Also close new album form when clearing selection
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
  };

  const handleSelectMultiple = async (ids: string[]) => {
    if (albumEditDirtyRef.current && !(await confirmUnsavedChanges())) return;
    setSelectedAlbumIds(new Set(ids));
    // Also close new album form when selecting multiple
    if (isNewAlbum) {
      setIsNewAlbum(false);
    }
  };

  const handleCreateNewAlbum = async () => {
    // Skip confirmation if already in new album mode
    if (!isNewAlbum && !(await confirmUnsavedChanges())) return;
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
      .eq('user_id', user.id)
      .is('deleted_at', null);

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
          .eq('user_id', user.id)
          .is('deleted_at', null);

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

    // Reset dirty state after successful deletion
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

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

    // Reset dirty state after successful deletion
    albumEditDirtyRef.current = false;
    setHasUnsavedChanges(false);

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
          New album
        </Button>
      }
      sidebar={
        <AlbumEditSidebar
          selectedAlbums={selectedAlbums}
          isNewAlbum={isNewAlbum}
          nickname={profile?.nickname}
          onSave={handleSaveAlbum}
          onBulkSave={handleBulkSaveAlbums}
          onDelete={handleDeleteAlbum}
          onBulkDelete={handleBulkDeleteAlbums}
          onCreate={handleCreateAlbum}
          isLoading={albumsLoading}
          onDirtyChange={handleDirtyChange}
        />
      }
    >
      {albumsLoading ? (
        <PageLoading message="Loading albums..." />
      ) : albums.length === 0 ? (
        <div className="border-2 border-dashed border-border-color p-12 text-center m-4 h-full flex flex-col items-center justify-center">
          <FolderSVG className="size-10 mb-2 inline-block" />
          <p className="mb-2 text-lg opacity-70">You don&apos;t have any albums yet</p>
          <p className="text-sm text-foreground/50 mb-4">
              Use the &quot;New album&quot; button to create a new album
          </p>
          <Button onClick={handleCreateNewAlbum} icon={<PlusSVG className="size-5 -ml-0.5" />}>New album</Button>
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
