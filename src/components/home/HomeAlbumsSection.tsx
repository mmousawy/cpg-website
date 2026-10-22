import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import StickySectionHeading from '@/components/layout/StickySectionHeading';
import ArrowLink from '@/components/shared/ArrowLink';
import { HOME_ALBUM_COVER_SIZES } from '@/config/homeImageSizes';
import { routes } from '@/config/routes';
import type { HomePageData } from '@/lib/data/home';

type HomeAlbumsSectionProps = Pick<HomePageData, 'albums'>;

export function HomeAlbumsSection({ albums }: HomeAlbumsSectionProps) {
  if (albums.length === 0) {
    return null;
  }

  return (
    <PageContainer
      className="relative z-10 py-0!"
    >
      <StickySectionHeading
        stickyClassName="mb-4 sm:mb-4"
        accessory={(
          <ArrowLink
            href={routes.gallery.url}
            prefetch={false}
          >
            View all albums
          </ArrowLink>
        )}
      >
        Recent albums
      </StickySectionHeading>
      <AlbumGrid
        albums={albums}
        liveLikeCounts={false}
        prefetchLinks={false}
        coverImageSizes={HOME_ALBUM_COVER_SIZES}
        className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] max-sm:[&>:nth-child(n+5)]:hidden sm:[&>:nth-child(n+4)]:hidden"
      />
    </PageContainer>
  );
}
