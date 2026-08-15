import PageContainer from '@/components/layout/PageContainer';import { cacheLife } from 'next/cache';

import WidePageContainer from '@/components/layout/WidePageContainer';
import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import { createMetadata } from '@/utils/metadata';

import { getRecentlyLikedPhotos } from '@/lib/data/gallery';

export const metadata = createMetadata({
  title: 'Recently liked photos',
  description: 'Browse photos that received likes recently from the community.',
  canonical: '/gallery/recent-likes',
  keywords: ['recently liked photos', 'popular photos', 'community favorites'],
});

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function RecentlyLikedPage() {
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
            className="mb-2 text-3xl font-bold font-heading"
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
          showSortToggle={false}
        />
      </WidePageContainer>
    </>
  );
}
