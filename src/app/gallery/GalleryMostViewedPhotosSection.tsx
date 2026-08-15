import Link from 'next/link';

import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import type { StreamPhoto } from '@/lib/data/gallery';

export function GalleryMostViewedPhotosSection({ photos }: { photos: StreamPhoto[] }) {
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
              href={`${routes.galleryPhotos.url}?sort=popular`}
              className="group"
            >
              <h2
                className="inline-block text-xl font-semibold group-hover:text-primary transition-colors font-heading"
              >
                Most viewed this week
              </h2>
            </Link>
            <p
              className="text-foreground/80 mt-1 text-sm"
            >
              Popular photos from the last 7 days
            </p>
          </div>
        }
      />
      <div
        className="mt-6 flex justify-center"
      >
        <Button
          href={`${routes.galleryPhotos.url}?sort=popular`}
          variant="secondary"
        >
          View all popular photos
        </Button>
      </div>
    </div>
  );
}
