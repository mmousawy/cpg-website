import { createPublicClient } from '@/utils/supabase/server';
import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import type { AlbumWithPhotos } from '@/types/albums';

export const metadata = {
  title: 'Photo galleries',
  description: 'Browse photo albums created by our community members',
};

// Cache indefinitely - revalidated on-demand when data changes

export default async function GalleriesPage() {
  const supabase = createPublicClient();

  // Fetch all public albums with their cover photos and user info
  // Only fetch necessary fields to reduce egress
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
      profile:profiles(full_name, nickname, avatar_url),
      photos:album_photos(id, photo_url)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching albums:', error);
  }

  const albumsWithPhotos = (albums || []) as unknown as AlbumWithPhotos[];

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Photo galleries</h1>
        <p className="text-lg opacity-70">
          Explore beautiful photo albums created by our community members
        </p>
      </div>

      {albumsWithPhotos.length === 0 ? (
        <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
          <p className="text-lg opacity-70">
            No galleries yet. Be the first to create one!
          </p>
        </div>
      ) : (
        <AlbumGrid albums={albumsWithPhotos} />
      )}
    </PageContainer>
  );
}
