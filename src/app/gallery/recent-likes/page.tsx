import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';

import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import { createMetadata } from '@/utils/metadata';

import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getRecentlyLikedPhotos } from '@/lib/data/gallery';
import {
  PHOTO_PAGE_PREFETCH_LIMIT,
  PHOTO_PAGE_SIZE_COMFORTABLE,
} from '@/utils/displayPreferences';

export const metadata = createMetadata({
  title: 'Recently liked photos',
  description: 'Browse photos that received likes recently from the community.',
  canonical: '/gallery/recent-likes',
  keywords: ['recently liked photos', 'popular photos', 'community favorites'],
});

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function RecentlyLikedPage() {
  const includeTestContent = await getIncludeTestContent();
  const allPhotos = await getRecentlyLikedPhotos(PHOTO_PAGE_PREFETCH_LIMIT, includeTestContent);
  const photos = allPhotos.slice(0, PHOTO_PAGE_SIZE_COMFORTABLE);
  const hasMore = allPhotos.length > PHOTO_PAGE_SIZE_COMFORTABLE;

  return (
    <PageContainer
      innerClassName="max-w-screen-xl"
    >
      <PageHeading
        title="Recently liked photos"
        description="Photos that received likes recently from the community"
      />
      <PhotosPaginated
        initialPhotos={photos}
        prefetchedPhotos={allPhotos}
        apiEndpoint="/api/gallery/recent-likes"
        perPage={PHOTO_PAGE_SIZE_COMFORTABLE}
        initialHasMore={hasMore}
        showSortToggle={false}
      />
    </PageContainer>
  );
}
