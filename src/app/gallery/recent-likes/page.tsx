import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getRecentlyLikedPhotos } from '@/lib/data/gallery';

export const metadata = createMetadata({
  title: 'Recently Liked Photos',
  description: 'Browse photos that received likes recently from the community.',
  canonical: '/gallery/recent-likes',
  keywords: ['recently liked photos', 'popular photos', 'community favorites'],
});

export default async function RecentlyLikedPage() {
  // Fetch one extra to check if there are more
  const allPhotos = await getRecentlyLikedPhotos(21);
  const photos = allPhotos.slice(0, 20);
  const hasMore = allPhotos.length > 20;

  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Recently liked photos
          </h1>
          <p
            className="text-lg opacity-70"
          >
            Photos that received likes recently from the community
          </p>
        </div>
      </PageContainer>

      <WidePageContainer
        className="pt-0!"
      >
        <PhotosPaginated
          initialPhotos={photos}
          apiEndpoint="/api/gallery/recent-likes"
          perPage={20}
          initialHasMore={hasMore}
        />
      </WidePageContainer>
    </>
  );
}
