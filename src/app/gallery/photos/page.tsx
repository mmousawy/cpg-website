import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import HelpLink from '@/components/shared/HelpLink';
import JsonLd from '@/components/shared/JsonLd';
import { createMetadata, getAbsoluteUrl, siteConfig } from '@/utils/metadata';

import { getPublicPhotostream } from '@/lib/data/gallery';

export const metadata = createMetadata({
  title: 'Community photo stream',
  description: 'Browse photos uploaded by the community.',
  canonical: '/gallery/photos',
  keywords: ['photos', 'community photos', 'photography'],
});

type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function PhotosPage({ searchParams }: PageProps) {
  const { sort } = await searchParams;
  const initialSort = sort === 'popular' ? 'popular' : 'recent';

  const allPhotos = await getPublicPhotostream(21, initialSort);
  const photos = allPhotos.slice(0, 20);
  const hasMore = allPhotos.length > 20;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'Gallery', item: getAbsoluteUrl('/gallery') },
      { '@type': 'ListItem', position: 3, name: 'Photos', item: getAbsoluteUrl('/gallery/photos') },
    ],
  };

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd}
      />
      <PageContainer>
        <div>
          <div
            className="flex items-center gap-2 mb-1"
          >
            <h1
              className="text-3xl font-bold font-heading"
            >
              Community photos
            </h1>
            <HelpLink
              href="photos"
              label="Help with photos and gallery"
              size="lg"
            />
          </div>
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
