import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getPublicPhotostream } from '@/lib/data/gallery';

export const metadata = createMetadata({
  title: 'Community Photos',
  description: 'Browse photos uploaded by the community.',
  canonical: '/gallery/photos',
  keywords: ['photos', 'community photos', 'photography'],
});

type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function PhotosPage({ searchParams }: PageProps) {
  const { sort } = await searchParams;
  const initialSort = sort === 'popular' ? 'popular' : 'recent';

  // Fetch one extra to check if there are more
  const allPhotos = await getPublicPhotostream(21, initialSort);
  const photos = allPhotos.slice(0, 20);
  const hasMore = allPhotos.length > 20;

  return (
    <>
      <PageContainer>
        <div>
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Community photos
          </h1>
          <p
            className="text-lg opacity-70"
          >
            Photos from the community
          </p>
        </div>
      </PageContainer>

      <WidePageContainer
        className="pt-0!"
      >
        <PhotosPaginated
          initialPhotos={photos}
          perPage={20}
          initialHasMore={hasMore}
          initialSort={initialSort}
        />
      </WidePageContainer>
    </>
  );
}
