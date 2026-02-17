'use client';

import { revalidateAlbums } from '@/app/actions/revalidate';
import { ModalContext } from '@/app/providers/ModalProvider';
import PhotoListItem from '@/components/manage/PhotoListItem';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import Input from '@/components/shared/Input';
import { useCreateAlbum } from '@/hooks/useAlbumMutations';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import type { Album } from '@/types/albums';
import type { PhotoWithAlbums } from '@/types/photos';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AlbumWithCount = Album & { photo_count?: number };
type SharedAlbumOption = AlbumWithCount & {
  owner_nickname: string | null;
  owner_name: string | null;
};

import FolderSVG from 'public/icons/folder.svg';
import LinkSVG from 'public/icons/link.svg';
import PlusSVG from 'public/icons/plus.svg';

interface AddPhotosToAlbumModalProps {
  photos: PhotoWithAlbums[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPhotosToAlbumModal({
  photos,
  onClose,
  onSuccess,
}: AddPhotosToAlbumModalProps) {
  const { user, profile } = useAuth();
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const createAlbumMutation = useCreateAlbum(user?.id, profile?.nickname);
  const modalContext = useContext(ModalContext);
  const [albums, setAlbums] = useState<AlbumWithCount[]>([]);
  const [sharedWithMeAlbums, setSharedWithMeAlbums] = useState<SharedAlbumOption[]>([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');

  // Calculate which albums already contain ALL selected photos
  const albumsWithAllPhotos = useMemo(() => {
    if (photos.length === 0) return new Set<string>();

    // Get album IDs for each photo
    const albumIdsByPhoto = photos.map((photo) =>
      new Set(photo.albums?.map((a) => a.id) || []),
    );

    // Find albums that appear in ALL photos
    if (albumIdsByPhoto.length === 0) return new Set<string>();

    // Start with the first photo's albums and intersect with the rest
    const commonAlbumIds = new Set<string>();
    const firstPhotoAlbums = albumIdsByPhoto[0];

    for (const albumId of firstPhotoAlbums) {
      if (albumIdsByPhoto.every((albumSet) => albumSet.has(albumId))) {
        commonAlbumIds.add(albumId);
      }
    }

    return commonAlbumIds;
  }, [photos]);

  // Track which selected albums are shared-with-me (need different RPC)
  const sharedWithMeIds = useMemo(
    () => new Set(sharedWithMeAlbums.map((a) => a.id)),
    [sharedWithMeAlbums],
  );

  // Reset selection and refetch albums when modal opens with new photos
  useEffect(() => {
    setSelectedAlbumIds(new Set());
    setError(null);
    if (!user) return;

    const fetchAlbums = async () => {
      setIsLoading(true);
      try {
        // Fetch own albums
        const { data, error } = await supabase
          .from('albums')
          .select('id, title, slug, cover_image_url, album_photos_active(count)')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Error fetching albums:', error);
        } else {
          const albumsWithCount = (data || []).map((album) => ({
            ...album,
            photo_count: (album.album_photos_active as Array<{ count: number }>)?.[0]?.count ?? 0,
          })) as unknown as AlbumWithCount[];
          setAlbums(albumsWithCount);
        }

        // Fetch shared-with-me albums
        const { data: memberships } = await supabase
          .from('shared_album_members')
          .select('album_id')
          .eq('user_id', user.id);

        if (memberships && memberships.length > 0) {
          const albumIds = memberships.map((m) => m.album_id);
          const { data: sharedData } = await supabase
            .from('albums')
            .select(`
              id, title, slug, cover_image_url,
              album_photos_active(count),
              owner_profile:profiles!albums_user_id_fkey(nickname, full_name)
            `)
            .in('id', albumIds)
            .neq('user_id', user.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

          if (sharedData) {
            const shared = sharedData.map((album) => ({
              ...album,
              photo_count: (album.album_photos_active as Array<{ count: number }>)?.[0]?.count ?? 0,
              owner_nickname: (album.owner_profile as { nickname: string | null; full_name: string | null } | null)?.nickname ?? null,
              owner_name: (album.owner_profile as { nickname: string | null; full_name: string | null } | null)?.full_name ?? null,
            })) as unknown as SharedAlbumOption[];
            setSharedWithMeAlbums(shared);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
      setIsLoading(false);
    };

    fetchAlbums();
  }, [photos, user, supabase]);

  const handleToggleAlbum = (albumId: string) => {
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(albumId)) {
        newSet.delete(albumId);
      } else {
        newSet.add(albumId);
      }
      return newSet;
    });
  };

  const handleCreateAlbum = async () => {
    if (!user || !newAlbumTitle.trim()) return;

    try {
      const slug = newAlbumTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const newAlbum = await createAlbumMutation.mutateAsync({
        title: newAlbumTitle.trim(),
        slug,
        isPublic: true,
        tags: [],
      });

      setAlbums([newAlbum as Album, ...albums]);
      setSelectedAlbumIds((prev) => new Set([...prev, newAlbum.id]));
      setNewAlbumTitle('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create album';
      console.error('Error creating album:', err);
      setError(message);
    }
  };

  const handleAddToAlbums = useCallback(async () => {
    if (!user || selectedAlbumIds.size === 0) return;

    setIsAdding(true);
    setError(null);

    try {
      const photoIds = photos.map((p) => p.id);

      // Split selected albums into own vs shared-with-me (different RPCs)
      const ownAlbumIds = Array.from(selectedAlbumIds).filter((id) => !sharedWithMeIds.has(id));
      const sharedAlbumIds = Array.from(selectedAlbumIds).filter((id) => sharedWithMeIds.has(id));

      const promises: Promise<{ error: { message: string } | null }>[] = [];

      // Own albums use add_photos_to_album
      for (const albumId of ownAlbumIds) {
        promises.push(
          Promise.resolve(
            supabase.rpc('add_photos_to_album', {
              p_album_id: albumId,
              p_photo_ids: photoIds,
            }),
          ).then((res) => ({ error: res.error ? { message: res.error.message } : null })),
        );
      }

      // Shared-with-me albums use add_photos_to_shared_album
      for (const albumId of sharedAlbumIds) {
        promises.push(
          Promise.resolve(
            supabase.rpc('add_photos_to_shared_album', {
              p_album_id: albumId,
              p_photo_ids: photoIds,
            }),
          ).then((res) => ({ error: res.error ? { message: res.error.message } : null })),
        );
      }

      const results = await Promise.all(promises);

      // Check for any errors
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        throw new Error(firstError.error.message || 'Failed to add photos to album');
      }

      // Invalidate client-side caches for albums that photos were added to
      const allAlbums = [...albums, ...sharedWithMeAlbums];
      const selectedAlbumsList = allAlbums.filter((a) => selectedAlbumIds.has(a.id));
      selectedAlbumsList.forEach((album) => {
        queryClient.invalidateQueries({ queryKey: ['album-photos', album.id] });
      });

      // Invalidate albums, photos, and counts caches
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['albums', user.id] });
        queryClient.invalidateQueries({ queryKey: ['shared-with-me-albums', user.id] });
        queryClient.invalidateQueries({ queryKey: ['photos', user.id] });
        queryClient.invalidateQueries({ queryKey: ['counts', user.id] });
      }

      // Revalidate server-side cache for own albums that photos were added to
      if (profile?.nickname) {
        const nickname = profile.nickname;
        const ownAlbumSlugs = albums
          .filter((a) => selectedAlbumIds.has(a.id))
          .map((album) => album.slug);
        if (ownAlbumSlugs.length > 0) {
          await revalidateAlbums(nickname, ownAlbumSlugs);
        }
      }

      // Revalidate server-side cache for shared albums by their owner nicknames
      const sharedSelected = sharedWithMeAlbums.filter((a) => selectedAlbumIds.has(a.id));
      for (const album of sharedSelected) {
        if (album.owner_nickname) {
          await revalidateAlbums(album.owner_nickname, [album.slug]);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add photos to albums';
      setError(message);
    } finally {
      setIsAdding(false);
    }
  }, [user, selectedAlbumIds, photos, supabase, albums, sharedWithMeAlbums, sharedWithMeIds, queryClient, profile, onSuccess, onClose]);

  // Set footer with action buttons
  useEffect(() => {
    modalContext.setFooter(
      <div
        className="flex justify-end gap-2"
      >
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isAdding}
        >
          Cancel
        </Button>
        <Button
          onClick={handleAddToAlbums}
          disabled={isAdding || selectedAlbumIds.size === 0}
          loading={isAdding}
        >
          {selectedAlbumIds.size === 0 ? 'Select an album' : `Add to ${selectedAlbumIds.size} album${selectedAlbumIds.size !== 1 ? 's' : ''}`}
        </Button>
      </div>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- modalContext.setFooter is stable, including modalContext causes infinite loop
  }, [selectedAlbumIds.size, isAdding, onClose, handleAddToAlbums]);

  return (
    <div
      className="flex flex-col select-none"
    >
      <div
        className="mb-4"
      >
        <p
          className="text-sm text-foreground/80"
        >
          Selected
          {photos.length}
          {' '}
          photos
        </p>
      </div>

      {/* Preview of photos being added */}
      <div
        className="mb-4 grid min-h-12.5 max-h-[30svh] md:grid-cols-2 gap-2 overflow-y-auto"
      >
        {photos.map((photo) => (
          <PhotoListItem
            key={photo.id}
            photo={photo}
            variant="compact"
          />
        ))}
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500"
        >
          {error}
        </div>
      )}

      <p
        className="mb-4 text-sm text-foreground/80"
      >
        Select which album(s) to add
        {' '}
        {photos.length === 1 ? 'this photo' : 'these photos'}
        {' '}
        to:
      </p>

      <div
        className="mb-4 flex-1"
      >
        {isLoading ? (
          <div
            className="h-14 flex items-center justify-center text-center"
          >
            <p
              className="text-foreground/50"
            >
              Loading albums...
            </p>
          </div>
        ) : albums.length === 0 && sharedWithMeAlbums.length === 0 ? (
          <div
            className="py-8 text-center"
          >
            <p
              className="mb-4 text-foreground/80"
            >
              No albums yet
            </p>
            <p
              className="text-sm text-foreground/50"
            >
              Create your first album below
            </p>
          </div>
        ) : (
          <>
            {/* Own albums */}
            {albums.length > 0 && (
              <div
                className="grid md:grid-cols-2 gap-3"
              >
                {albums.map((album) => {
                  const isAlreadyAdded = albumsWithAllPhotos.has(album.id);
                  const isSelected = isAlreadyAdded || selectedAlbumIds.has(album.id);
                  return (
                    <div
                      key={album.id}
                      onClick={() => !isAlreadyAdded && handleToggleAlbum(album.id)}
                      className={clsx(
                        'group flex items-center pr-3 transition-all',
                        isAlreadyAdded
                          ? 'cursor-not-allowed opacity-60 ring-1 ring-border-color-strong bg-background'
                          : isSelected
                            ? 'cursor-pointer ring-2 ring-primary ring-offset-1 dark:ring-offset-white/50'
                            : 'cursor-pointer ring-1 ring-border-color-strong hover:ring-2 hover:ring-primary/50',
                      )}
                    >
                      <div
                        className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-background"
                      >
                        {album.cover_image_url ? (
                          <Image
                            src={album.cover_image_url}
                            alt={album.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <FolderSVG
                            className="size-6 text-foreground/30"
                          />
                        )}
                      </div>
                      <div
                        className="ml-2 flex flex-1 flex-col gap-0.5"
                      >
                        <span
                          className="text-sm font-medium line-clamp-2 leading-none"
                        >
                          {album.title}
                        </span>
                        {album.photo_count !== undefined && (
                          <span
                            className="text-xs text-foreground/50"
                          >
                            {album.photo_count}
                            {' '}
                            photo
                            {album.photo_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <Checkbox
                        checked={isSelected}
                        disabled={isAlreadyAdded}
                        onChange={() => handleToggleAlbum(album.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Shared with you albums */}
            {sharedWithMeAlbums.length > 0 && (
              <>
                <p
                  className={clsx(
                    'text-xs font-medium uppercase tracking-wider text-foreground/50',
                    albums.length > 0 ? 'mt-4 mb-3' : 'mb-3',
                  )}
                >
                  Shared with you
                </p>
                <div
                  className="grid md:grid-cols-2 gap-3"
                >
                  {sharedWithMeAlbums.map((album) => {
                    const isSelected = selectedAlbumIds.has(album.id);
                    const ownerLabel = album.owner_nickname || album.owner_name || 'Unknown';
                    return (
                      <div
                        key={album.id}
                        onClick={() => handleToggleAlbum(album.id)}
                        className={clsx(
                          'group flex items-center pr-3 transition-all',
                          isSelected
                            ? 'cursor-pointer ring-2 ring-primary ring-offset-1 dark:ring-offset-white/50'
                            : 'cursor-pointer ring-1 ring-border-color-strong hover:ring-2 hover:ring-primary/50',
                        )}
                      >
                        <div
                          className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden bg-background"
                        >
                          {album.cover_image_url ? (
                            <Image
                              src={album.cover_image_url}
                              alt={album.title}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <FolderSVG
                              className="size-6 text-foreground/30"
                            />
                          )}
                          <div
                            className="absolute bottom-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                          >
                            <LinkSVG
                              className="size-2.5 text-white"
                            />
                          </div>
                        </div>
                        <div
                          className="ml-2 flex flex-1 flex-col gap-0.5"
                        >
                          <span
                            className="text-sm font-medium line-clamp-2 leading-none"
                          >
                            {album.title}
                          </span>
                          <span
                            className="text-xs text-foreground/50"
                          >
                            by
                            {' '}
                            {ownerLabel}
                            {album.photo_count !== undefined && (
                              <>
                                {' '}
                                ·
                                {album.photo_count}
                                {' '}
                                photo
                                {album.photo_count !== 1 ? 's' : ''}
                              </>
                            )}
                          </span>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleAlbum(album.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Create new album */}
      <div
        className="pl-3 py-1 border-l-2 border-border-color-strong"
      >
        <label
          className="mb-2 block text-sm text-foreground/80"
        >
          Or create a new album
        </label>
        <div
          className="flex gap-2"
        >
          <Input
            type="text"
            value={newAlbumTitle}
            onChange={(e) => setNewAlbumTitle(e.target.value)}
            placeholder="Album title"
            fullWidth={false}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateAlbum();
              }
            }}
          />
          <Button
            onClick={handleCreateAlbum}
            disabled={!newAlbumTitle.trim() || createAlbumMutation.isPending}
            loading={createAlbumMutation.isPending}
            size="sm"
            icon={<PlusSVG
              className="size-4"
            />}
          >
            <span
              className="hidden md:block"
            >
              Create
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
