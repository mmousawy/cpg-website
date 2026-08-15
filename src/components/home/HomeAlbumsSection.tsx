import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import ArrowLink from '@/components/shared/ArrowLink';
import { routes } from '@/config/routes';
import { getRecentAlbums } from '@/lib/data/albums';

export async function HomeAlbumsSection() {
  const albums = await getRecentAlbums(3);

  if (albums.length === 0) {
    return null;
  }

  return (
    <PageContainer
      className="relative z-10 py-0!"
    >
      <div
        className="mb-4 flex items-center justify-between"
      >
        <h3
          className="text-xl font-semibold font-heading"
        >
          Recent albums
        </h3>
        <ArrowLink
          href={routes.gallery.url}
          prefetch={false}
        >
          View all albums
        </ArrowLink>
      </div>
      <AlbumGrid
        albums={albums}
        liveLikeCounts={false}
        prefetchLinks={false}
        className="grid gap-2 sm:gap-4 grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]"
      />
    </PageContainer>
  );
}
