import AlbumsPaginated from '@/components/gallery/AlbumsPaginated';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import HelpLink from '@/components/shared/HelpLink';
import JsonLd from '@/components/shared/JsonLd';
import { createMetadata, getAbsoluteUrl, siteConfig } from '@/utils/metadata';

import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getPublicAlbums } from '@/lib/data/albums';

export const metadata = createMetadata({
  title: 'Community photo albums',
  description: 'Browse all photo albums created by the community.',
  canonical: '/gallery/albums',
  keywords: ['photo albums', 'photography collections', 'community albums'],
});

type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

// Block until cached data resolves so SSR includes full HTML (no streaming shell)
export const instant = false;

export default async function AlbumsPage({ searchParams }: PageProps) {
  const { sort } = await searchParams;
  const initialSort = sort === 'popular' ? 'popular' : 'recent';

  const includeTestContent = await getIncludeTestContent();
  const allAlbums = await getPublicAlbums(21, initialSort, includeTestContent);
  const albums = allAlbums.slice(0, 20);
  const hasMore = allAlbums.length > 20;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'Gallery', item: getAbsoluteUrl('/gallery') },
      { '@type': 'ListItem', position: 3, name: 'Albums', item: getAbsoluteUrl('/gallery/albums') },
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
          title="Photo albums"
          description="Photo collections from community members"
          aside={
            <HelpLink
              href="manage-albums"
              label="Help with albums"
              size="lg"
              className="max-sm:m-0"
            />
          }
        />
        <AlbumsPaginated
          initialAlbums={albums}
          perPage={20}
          initialHasMore={hasMore}
          initialSort={initialSort}
        />
      </PageContainer>
    </>
  );
}
