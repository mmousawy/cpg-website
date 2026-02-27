import AlbumsPaginated from '@/components/gallery/AlbumsPaginated';
import JsonLd from '@/components/shared/JsonLd';
import PageContainer from '@/components/layout/PageContainer';
import HelpLink from '@/components/shared/HelpLink';
import WidePageContainer from '@/components/layout/WidePageContainer';
import { createMetadata, getAbsoluteUrl, siteConfig } from '@/utils/metadata';

// Cached data functions
import { getPublicAlbums } from '@/lib/data/albums';

export const metadata = createMetadata({
  title: 'Photo Albums',
  description: 'Browse all photo albums created by the community.',
  canonical: '/gallery/albums',
  keywords: ['photo albums', 'photography collections', 'community albums'],
});

type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function AlbumsPage({ searchParams }: PageProps) {
  const { sort } = await searchParams;
  const initialSort = sort === 'popular' ? 'popular' : 'recent';

  // Fetch one extra to check if there are more
  const allAlbums = await getPublicAlbums(21, initialSort);
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
      <PageContainer>
        <div>
          <div
            className="flex items-center gap-2 mb-2"
          >
            <h1
              className="text-3xl font-bold"
            >
              Photo albums
            </h1>
            <HelpLink
              href="manage-albums"
              label="Help with albums"
            />
          </div>
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
          initialSort={initialSort}
        />
      </WidePageContainer>
    </>
  );
}
