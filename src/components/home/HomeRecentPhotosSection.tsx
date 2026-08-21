import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
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
      <div
        className="mb-4 flex items-center justify-between"
      >
        <h3
          className="text-xl font-semibold font-heading"
        >
          Recent photos
        </h3>
        <ArrowLink
          href="/gallery/photos"
          prefetch={false}
        >
          View all photos
        </ArrowLink>
      </div>
      <JustifiedPhotoGrid
        photos={photos}
        showAttribution
        liveLikeCounts={false}
      />
    </WidePageContainer>
  );
}
