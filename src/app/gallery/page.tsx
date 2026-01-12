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
      photos:album_photos_active!inner(
        id,
        photo_url
      )
    `)
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching albums:', error);
  }

  // Filter out albums with no photos and albums from suspended users
  // album_photos_active view already excludes deleted photos
  const albumsWithPhotos = ((albums || []) as any[])
    .filter((album) => {
      // Exclude albums from suspended users and albums with no photos
      const profile = album.profile as any;
      return album.photos && album.photos.length > 0 && profile && !profile.suspended_at;
    }) as unknown as AlbumWithPhotos[];

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Photography gallery</h1>
        <p className="text-lg opacity-70">
          Explore beautiful photos from the community
        </p>
      </div>

      {/* TODO: Add community photostream  */}
      {/* <JustifiedPhotoGrid /> */}

      {albumsWithPhotos.length === 0 ? (
        <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
          <p className="text-lg opacity-70">
            No photos yet. Be the first to upload some!
          </p>
        </div>
      ) : (
        <AlbumGrid albums={albumsWithPhotos} className="grid gap-2 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" />
      )}
    </PageContainer>
  );
}
