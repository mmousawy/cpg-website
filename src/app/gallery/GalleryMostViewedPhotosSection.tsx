import DensityAwarePhotoGrid from '@/components/photo/DensityAwarePhotoGrid';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import type { StreamPhoto } from '@/lib/data/gallery';

import { GalleryLinkedSectionHeading } from '@/app/gallery/GalleryLinkedSectionHeading';

export function GalleryMostViewedPhotosSection({ photos }: { photos: StreamPhoto[] }) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div>
      <GalleryLinkedSectionHeading
        href={`${routes.galleryPhotos.url}?sort=popular`}
        title="Most viewed this week"
        description="Popular photos from the last 7 days"
      />
      <DensityAwarePhotoGrid
        photos={photos}
        showAttribution
        liveLikeCounts={false}
      />
      <div
        className="mt-4 sm:mt-6 flex justify-center "
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
