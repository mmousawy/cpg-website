import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import type { AlbumWithPhotos } from '@/types/albums';
import { createPublicClient } from '@/utils/supabase/server';

export const metadata = {
  title: 'Photography gallery',
  description: 'Browse photo albums created by our community members',
};

// Cache indefinitely - revalidated on-demand when data changes

export default async function GalleryPage() {
  const supabase = createPublicClient();

  // Fetch all public albums with their cover photos and user info
  // Only fetch necessary fields to reduce egress
  // Exclude albums from suspended users
  const { data: albums, error } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      slug,
      cover_image_url,
      is_public,
      created_at,
      profile:profiles(full_name, nickname, avatar_url, suspended_at),
      photos:album_photos!inner(
        id,
        photo_url,
        photo:photos!album_photos_photo_id_fkey(deleted_at)
      )
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching albums:', error);
  }

  // Filter out albums with deleted photos and albums from suspended users
  const albumsWithPhotos = ((albums || []) as any[])
    .map((album) => ({
      ...album,
      photos: (album.photos || []).filter((ap: any) => !ap.photo?.deleted_at),
    }))
    .filter((album) => {
      // Exclude albums from suspended users
      const profile = album.profile as any;
      return album.photos.length > 0 && profile && !profile.suspended_at;
    }) as unknown as AlbumWithPhotos[];

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Photography gallery</h1>
        <p className="text-lg opacity-70">
          Explore beautiful photo albums created by our community members
        </p>
      </div>

      {albumsWithPhotos.length === 0 ? (
        <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
          <p className="text-lg opacity-70">
            No photos yet. Be the first to upload some!
          </p>
        </div>
      ) : (
        <AlbumGrid albums={albumsWithPhotos} />
      )}
    </PageContainer>
  );
}
