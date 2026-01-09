'use client';

import {
  AlbumEditEmptyState,
  AlbumEditSidebar,
  AlbumGrid,
  type AlbumFormData,
} from '@/components/manage';
import ManageLayout from '@/components/manage/ManageLayout';
import Button from '@/components/shared/Button';
import PageLoading from '@/components/shared/PageLoading';
import { useManage } from '@/context/ManageContext';
import { useAuth } from '@/hooks/useAuth';
import type { Album, AlbumWithPhotos } from '@/types/albums';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import PlusSVG from 'public/icons/plus.svg';

export default function AlbumsPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const { refreshCounts } = useManage();

  const albumEditDirtyRef = useRef(false);

  const confirmUnsavedChanges = useCallback((): boolean => {
    if (!albumEditDirtyRef.current) return true;
    const confirmed = window.confirm(
      'You have unsaved changes. Are you sure you want to leave without saving?',
    );
    if (confirmed) {
      albumEditDirtyRef.current = false;
    }
    return confirmed;
  }, []);

  // State
  const [albums, setAlbums] = useState<AlbumWithPhotos[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [isNewAlbum, setIsNewAlbum] = useState(false);

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
          photos:album_photos(id, photo_url)
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

  const handleAlbumClick = (album: AlbumWithPhotos) => {
    if (!confirmUnsavedChanges()) return;
    router.push(`/account/albums/${album.slug}`);
  };

  const handleCreateNewAlbum = () => {
    if (!confirmUnsavedChanges()) return;
    setIsNewAlbum(true);
  };

  const handleSaveNewAlbum = async (data: AlbumFormData) => {
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

  const handleCancelNewAlbum = () => {
    setIsNewAlbum(false);
  };

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
            album={null}
            isNewAlbum={true}
            nickname={profile?.nickname}
            onSave={handleSaveNewAlbum}
            isDirtyRef={albumEditDirtyRef}
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
        <AlbumGrid albums={albums} onAlbumClick={handleAlbumClick} />
      )}
    </ManageLayout>
  );
}

