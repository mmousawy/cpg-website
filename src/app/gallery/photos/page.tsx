import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getPublicPhotostream } from '@/lib/data/gallery';

export const metadata = createMetadata({
  title: 'Recent Photos',
  description: 'Browse the latest photos uploaded by the community.',
  canonical: '/gallery/photos',
  keywords: ['recent photos', 'latest uploads', 'community photostream'],
});

export default async function RecentPhotosPage() {
  // Fetch one extra to check if there are more
  const allPhotos = await getPublicPhotostream(21);
  const photos = allPhotos.slice(0, 20);
  const hasMore = allPhotos.length > 20;

  return (
    <>
      <PageContainer>
        <div
          className=""
        >
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Recent photos
          </h1>
          <p
            className="text-lg opacity-70"
          >
            Latest uploads from the community
          </p>
        </div>
      </PageContainer>

      <WidePageContainer
        className="pt-0!"
      >
        <PhotosPaginated
          initialPhotos={photos}
          apiEndpoint="/api/gallery/photos"
          perPage={20}
          initialHasMore={hasMore}
        />
      </WidePageContainer>
    </>
  );
}
