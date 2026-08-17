import Link from 'next/link';

import AlbumGrid from '@/components/album/AlbumGrid';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import type { AlbumWithPhotos } from '@/types/albums';

export function GalleryTrendingAlbumsSection({ albums }: { albums: AlbumWithPhotos[] }) {
  if (albums.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        className="mb-6"
      >
        <Link
          href={`${routes.galleryAlbums.url}?sort=popular`}
          className="group"
        >
          <h2
            className="inline-block text-xl font-semibold group-hover:text-primary transition-colors font-heading"
          >
            Trending albums
          </h2>
        </Link>
        <p
          className="text-sm text-foreground/80 leading-snug"
        >
          Most viewed albums from the last 7 days
        </p>
      </div>
      <AlbumGrid
        albums={albums}
        liveLikeCounts={false}
        className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6"
      />
      <div
        className="mt-6 flex justify-center"
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
