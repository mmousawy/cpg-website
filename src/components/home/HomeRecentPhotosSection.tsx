import StickySectionHeading from '@/components/layout/StickySectionHeading';
import WidePageContainer from '@/components/layout/WidePageContainer';
import DensityAwarePhotoGrid from '@/components/photo/DensityAwarePhotoGrid';
import ArrowLink from '@/components/shared/ArrowLink';
import type { HomePageData } from '@/lib/data/home';

type HomeRecentPhotosSectionProps = Pick<HomePageData, 'photos'>;

export function HomeRecentPhotosSection({ photos }: HomeRecentPhotosSectionProps) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <WidePageContainer
      className="py-0!"
    >
      <StickySectionHeading
        as="h3"
        stickyClassName="mb-4 sm:mb-4"
        accessory={(
          <ArrowLink
            href="/gallery/photos"
            prefetch={false}
          >
            View all photos
          </ArrowLink>
        )}
      >
        Recent photos
      </StickySectionHeading>
      <DensityAwarePhotoGrid
        photos={photos}
        showAttribution
        liveLikeCounts={false}
      />
    </WidePageContainer>
  );
}
