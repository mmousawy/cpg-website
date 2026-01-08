'use client';

import AlbumMiniCard from '@/components/album/AlbumMiniCard';
import Button from '@/components/shared/Button';
import type { Photo } from '@/types/photos';
import { createClient } from '@/utils/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import PhotoEditEmptyState from './PhotoEditEmptyState';

type PhotoAlbum = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  profile?: { nickname: string } | null;
};

const photoFormSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  is_public: z.boolean(),
});

export type PhotoFormData = z.infer<typeof photoFormSchema>;

interface PhotoEditSidebarProps {
  selectedPhotos: Photo[];
  onSave: (photoId: string, data: PhotoFormData) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onAddToAlbum: (photoIds: string[]) => void;
  isLoading?: boolean;
}

export default function PhotoEditSidebar({
  selectedPhotos,
  onSave,
  onDelete,
  onAddToAlbum,
  isLoading = false,
}: PhotoEditSidebarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photoAlbums, setPhotoAlbums] = useState<PhotoAlbum[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);

  const supabase = createClient();
  const photo = selectedPhotos[0]; // For now, handle single photo editing
  const isMultiple = selectedPhotos.length > 1;

  // Fetch albums this photo belongs to
  useEffect(() => {
    if (!photo?.url) {
      setPhotoAlbums([]);
      return;
    }

    const fetchPhotoAlbums = async () => {
      setAlbumsLoading(true);
      const { data: albumPhotos } = await supabase
        .from('album_photos')
        .select('album_id, albums(id, title, slug, cover_image_url, profile:profiles(nickname))')
        .eq('photo_url', photo.url);

      const albums = (albumPhotos || [])
        .map((ap) => ap.albums as unknown as PhotoAlbum)
        .filter((a): a is PhotoAlbum => a !== null);

      setPhotoAlbums(albums);
      setAlbumsLoading(false);
    };

    fetchPhotoAlbums();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.url, photo?.id]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<PhotoFormData>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      title: photo?.title || null,
      description: photo?.description || null,
      is_public: photo?.is_public ?? true,
    },
  });

  // Reset form when selected photo changes
  useEffect(() => {
    if (photo) {
      reset({
        title: photo.title || null,
        description: photo.description || null,
        is_public: photo.is_public ?? true,
      });
      setError(null);
      setSuccess(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id, reset]);

  const onSubmit = async (data: PhotoFormData) => {
    if (!photo) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSave(photo.id, data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save photo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!photo) return;
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await onDelete(photo.id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete photo');
    }
  };

  if (!photo) {
    return (
      <div className="sticky top-4 h-[calc(100vh-81px)] overflow-y-auto p-6">
        <PhotoEditEmptyState />
      </div>
    );
  }

  if (isMultiple) {
    return (
      <div className="sticky top-4 h-[calc(100vh-81px)] overflow-y-auto p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Edit {selectedPhotos.length} Photos
        </h2>
        <p className="mb-4 text-sm text-foreground/60">
          Batch editing coming soon. Select a single photo to edit details.
        </p>
        <Button
          variant="secondary"
          onClick={() => onAddToAlbum(selectedPhotos.map((p) => p.id))}
        >
          Add to Album
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky top-4 h-[calc(100vh-81px)] overflow-y-auto bg-background-light p-6">
      <h2 className="mb-6 text-lg font-semibold">Edit Photo</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            placeholder="Photo title (optional)"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            className="rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            placeholder="Tell us about this photo..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_public"
            type="checkbox"
            {...register('is_public')}
            className="size-4 rounded border-border-color text-primary focus:ring-primary"
          />
          <label htmlFor="is_public" className="text-sm">
            Make this photo public
          </label>
        </div>

        <hr className="my-6 border-border-color" />

        {/* Albums this photo belongs to */}
        {photoAlbums.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium">Part of albums</h3>
            {albumsLoading ? (
              <p className="text-sm text-foreground/60">Loading...</p>
            ) : photoAlbums.length > 0 ? (
              <div className="flex flex-col gap-2">
                {photoAlbums.map((album) => (
                  <AlbumMiniCard
                    key={album.id}
                    title={album.title}
                    slug={album.slug}
                    coverImageUrl={album.cover_image_url}
                    href={`/@${album.profile?.nickname}/album/${album.slug}`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground/60">Not in any albums yet.</p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-500">
            Photo saved successfully!
          </div>
        )}

        <div className="flex flex-col gap-2 pt-4">
          <Button
            type="submit"
            disabled={isSaving || isLoading || !isDirty}
            loading={isSaving}
            fullWidth
          >
            Save Changes
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => onAddToAlbum([photo.id])}
            fullWidth
          >
            Add to Album
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={isSaving || isLoading}
            fullWidth
          >
            Delete Photo
          </Button>
        </div>
      </form>
    </div>
  );
}
