import Link from 'next/link';

import AlbumGrid from '@/components/album/AlbumGrid';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';
import { routes } from '@/config/routes';
import type { AlbumWithPhotos } from '@/types/albums';
import FolderSVG from 'public/icons/folder.svg';

export function GalleryRecentAlbumsSection({ albums }: { albums: AlbumWithPhotos[] }) {
  return (
    <div>
      <div
        className="mb-6"
      >
        <Link
          href={routes.galleryAlbums.url}
          className="group"
        >
          <h2
            className="inline-block text-xl font-semibold group-hover:text-primary transition-colors font-heading"
          >
            Recent albums
          </h2>
        </Link>
        <p
          className="text-foreground/80 mt-1 text-sm"
        >
          Photo collections from community members
        </p>
      </div>

      {albums.length === 0 ? (
        <EmptyState
          icon={<FolderSVG
            className="size-10 inline-block"
          />}
          title="No albums yet. Be the first to create one!"
        />
      ) : (
        <>
          <AlbumGrid
            albums={albums}
            liveLikeCounts={false}
            className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6"
          />
          <div
            className="mt-6 flex justify-center"
          >
            <Button
              href={routes.galleryAlbums.url}
              variant="secondary"
            >
              View all recent albums
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
