import AlbumGrid from '@/components/album/AlbumGrid';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import type { AlbumWithPhotos } from '@/types/albums';

import { GalleryLinkedSectionHeading } from '@/app/gallery/GalleryLinkedSectionHeading';

export function GalleryTrendingAlbumsSection({ albums }: { albums: AlbumWithPhotos[] }) {
  if (albums.length === 0) {
    return null;
  }

  return (
    <div>
      <GalleryLinkedSectionHeading
        href={`${routes.galleryAlbums.url}?sort=popular`}
        title="Trending albums"
        description="Most viewed albums from the last 7 days"
      />
      <AlbumGrid
        albums={albums}
        liveLikeCounts={false}
        className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6"
      />
      <div
        className="mt-4 sm:mt-6 flex justify-center "
      >
        <Button
          href={`${routes.galleryAlbums.url}?sort=popular`}
          variant="secondary"
        >
          View all popular albums
        </Button>
      </div>
    </div>
  );
}
