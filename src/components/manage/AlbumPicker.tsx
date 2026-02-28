'use client';

import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { useCreateAlbum } from '@/hooks/useAlbumMutations';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import type { Album } from '@/types/albums';
import { useEffect, useState } from 'react';

interface AlbumPickerProps {
  selectedAlbumIds: string[];
  onSelectionChange: (albumIds: string[]) => void;
  onCreateNew?: () => void;
}

export default function AlbumPicker({
  selectedAlbumIds,
  onSelectionChange,
  onCreateNew,
}: AlbumPickerProps) {
  const { user, profile } = useAuth();
  const supabase = useSupabase();
  const createAlbumMutation = useCreateAlbum(user?.id, profile?.nickname);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchAlbums = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('albums')
          .select('id, title, slug')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Error fetching albums:', error);
        } else {
          setAlbums((data || []) as Album[]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      }
      setIsLoading(false);
    };

    fetchAlbums();
  }, [user, supabase]);

  const handleToggleAlbum = (albumId: string) => {
    const newSelection = selectedAlbumIds.includes(albumId)
      ? selectedAlbumIds.filter((id) => id !== albumId)
      : [...selectedAlbumIds, albumId];
    onSelectionChange(newSelection);
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
      onSelectionChange([...selectedAlbumIds, newAlbum.id]);
      setNewAlbumTitle('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create album';
      console.error('Error creating album:', err);
      alert(message);
    }
  };

  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-border-color bg-background-light p-4"
      >
        <p
          className="text-sm text-foreground/60"
        >
          Loading albums...
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
    >
      <div>
        <label
          className="mb-2 block text-sm font-medium"
        >
          Add to album? (optional)
        </label>
        <div
          className="space-y-2"
        >
          {albums.length === 0 ? (
            <p
              className="text-sm text-foreground/60"
            >
              No albums yet
            </p>
          ) : (
            albums.map((album) => (
              <label
                key={album.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-color bg-background p-3 transition-colors hover:bg-background-light"
              >
                <input
                  type="checkbox"
                  checked={selectedAlbumIds.includes(album.id)}
                  onChange={() => handleToggleAlbum(album.id)}
                  className="size-4 rounded border-border-color text-primary focus-visible:border-primary focus-visible:outline-none"
                />
                <span
                  className="flex-1 text-sm"
                >
                  {album.title}
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div
        className="rounded-lg border border-border-color bg-background-light p-4"
      >
        <label
          className="mb-2 block text-sm font-medium"
        >
          Create new album
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
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
