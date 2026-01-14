import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';

// Cached data function
import { getPublicAlbums } from '@/lib/data/albums';

export const metadata = {
  title: 'Photography gallery',
  description: 'Browse photo albums created by our community members',
};

export default async function GalleryPage() {
  // Fetch albums using cached data function
  const albums = await getPublicAlbums(50);

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

      {albums.length === 0 ? (
        <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
          <p className="text-lg opacity-70">
            No photos yet. Be the first to upload some!
          </p>
        </div>
      ) : (
        <AlbumGrid albums={albums} className="grid gap-2 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" />
      )}
    </PageContainer>
  );
}
