import DensityAwarePhotoGrid from '@/components/photo/DensityAwarePhotoGrid';
import Button from '@/components/shared/Button';
import { routes } from '@/config/routes';
import type { StreamPhoto } from '@/lib/data/gallery';

import { GalleryLinkedSectionHeading } from '@/app/gallery/GalleryLinkedSectionHeading';

export function GalleryRecentPhotosSection({ photos }: { photos: StreamPhoto[] }) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <div>
      <GalleryLinkedSectionHeading
        href={routes.galleryPhotos.url}
        title="Recent photos"
        description="Latest uploads from the community"
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
          href={routes.galleryPhotos.url}
          variant="secondary"
        >
          View all recent photos
        </Button>
      </div>
    </div>
  );
}
