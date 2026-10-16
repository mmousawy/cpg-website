import AlbumGrid from '@/components/album/AlbumGrid';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';
import { routes } from '@/config/routes';
import type { AlbumWithPhotos } from '@/types/albums';
import FolderSVG from 'public/icons/folder.svg';

import { GalleryLinkedSectionHeading } from '@/app/gallery/GalleryLinkedSectionHeading';

export function GalleryRecentAlbumsSection({ albums }: { albums: AlbumWithPhotos[] }) {
  return (
    <div>
      <GalleryLinkedSectionHeading
        href={routes.galleryAlbums.url}
        title="Recent albums"
        description="Photo collections from community members"
      />

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
            className="mt-4 sm:mt-6 flex justify-center "
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
