import PhotosPaginated from '@/components/gallery/PhotosPaginated';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import HelpLink from '@/components/shared/HelpLink';
import JsonLd from '@/components/shared/JsonLd';
import { createMetadata, getAbsoluteUrl, siteConfig } from '@/utils/metadata';

import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getPublicPhotostream } from '@/lib/data/gallery';
import {
  PHOTO_PAGE_PREFETCH_LIMIT,
  PHOTO_PAGE_SIZE_COMFORTABLE,
} from '@/utils/displayPreferences';

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

  const includeTestContent = await getIncludeTestContent();
  const allPhotos = await getPublicPhotostream(PHOTO_PAGE_PREFETCH_LIMIT, initialSort, includeTestContent);
  const photos = allPhotos.slice(0, PHOTO_PAGE_SIZE_COMFORTABLE);
  const hasMore = allPhotos.length > PHOTO_PAGE_SIZE_COMFORTABLE;

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
      <PageContainer
        innerClassName="max-w-screen-xl"
      >
        <PageHeading
          title="Community photos"
          description="Photos from the community"
          aside={
            <HelpLink
              href="photos"
              label="Help with photos and gallery"
              size="lg"
              className="max-sm:m-0"
            />
          }
        />
        <PhotosPaginated
          initialPhotos={photos}
          prefetchedPhotos={allPhotos}
          perPage={PHOTO_PAGE_SIZE_COMFORTABLE}
          initialHasMore={hasMore}
          initialSort={initialSort}
        />
      </PageContainer>
    </>
  );
}
