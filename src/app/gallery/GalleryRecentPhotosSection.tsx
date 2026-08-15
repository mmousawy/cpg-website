import Link from 'next/link';

import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import type { StreamPhoto } from '@/lib/data/gallery';

export function GalleryRecentPhotosSection({ photos }: { photos: StreamPhoto[] }) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div>
      <JustifiedPhotoGrid
        photos={photos}
        showAttribution
        liveLikeCounts={false}
        header={
          <div
            className="mb-6"
          >
            <Link
              href={routes.galleryPhotos.url}
              className="group"
            >
              <h2
                className="inline-block text-xl font-semibold group-hover:text-primary transition-colors font-heading"
              >
                Recent photos
              </h2>
            </Link>
            <p
              className="text-foreground/80 mt-1 text-sm"
            >
              Latest uploads from the community
            </p>
          </div>
        }
      />
      <div
        className="mt-6 flex justify-center"
      >
        <Button
          href={routes.galleryPhotos.url}
          variant="secondary"
        >
          View all recent photos
        </Button>
      </div>
    </div>
  );
}
