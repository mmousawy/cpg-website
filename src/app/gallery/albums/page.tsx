import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import AlbumsPaginated from '@/components/gallery/AlbumsPaginated';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getPublicAlbums } from '@/lib/data/albums';

export const metadata = createMetadata({
  title: 'Photo Albums',
  description: 'Browse all photo albums created by the community.',
  canonical: '/gallery/albums',
  keywords: ['photo albums', 'photography collections', 'community albums'],
});

export default async function AlbumsPage() {
  // Fetch one extra to check if there are more
  const allAlbums = await getPublicAlbums(21);
  const albums = allAlbums.slice(0, 20);
  const hasMore = allAlbums.length > 20;

  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Photo albums
          </h1>
          <p
            className="text-lg opacity-70"
          >
            Photo collections from community members
          </p>
        </div>
      </PageContainer>

      <WidePageContainer
        className="pt-0!"
      >
        <AlbumsPaginated
          initialAlbums={albums}
          perPage={20}
          initialHasMore={hasMore}
        />
      </WidePageContainer>
    </>
  );
}
