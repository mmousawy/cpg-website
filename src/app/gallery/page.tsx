import { GalleryMostViewedPhotosSection } from '@/app/gallery/GalleryMostViewedPhotosSection';
import GalleryPageHeader from '@/app/gallery/GalleryPageHeader';
import { GalleryRecentAlbumsSection } from '@/app/gallery/GalleryRecentAlbumsSection';
import { GalleryRecentPhotosSection } from '@/app/gallery/GalleryRecentPhotosSection';
import { GalleryTagsSection } from '@/app/gallery/GalleryTagsSection';
import { GalleryTrendingAlbumsSection } from '@/app/gallery/GalleryTrendingAlbumsSection';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import SignUpCTA from '@/components/shared/SignUpCTA';
import { getMostViewedAlbumsLastWeek, getPublicAlbums } from '@/lib/data/albums';
import { getMostViewedPhotosLastWeek, getPopularTags, getPublicPhotostream } from '@/lib/data/gallery';
import { createMetadata } from '@/utils/metadata';

export const metadata = createMetadata({
  title: 'Community gallery',
  description:
    'Browse photo albums created by our community members. Explore beautiful photos from our photography meetups and community events.',
  canonical: '/gallery',
  keywords: ['photography gallery', 'photo albums', 'photography portfolio', 'community photos'],
});

export const instant = false;

export default async function GalleryPage() {
  const [popularTags, mostViewedPhotos, mostViewedAlbums, recentPhotos, recentAlbums] = await Promise.all([
    getPopularTags(30),
    getMostViewedPhotosLastWeek(10),
    getMostViewedAlbumsLastWeek(10),
    getPublicPhotostream(10),
    getPublicAlbums(10),
  ]);

  return (
    <>
      <PageContainer
        className="pb-0!"
      >
        <GalleryPageHeader />
      </PageContainer>

      <div
        className="grid min-w-0 gap-10 md:gap-12 pb-10 md:pb-12 [&>*]:min-w-0"
      >
        <GalleryTagsSection
          tags={popularTags}
        />

        <WidePageContainer
          className="py-0!"
        >
          <div
            className="grid min-w-0 gap-10 md:gap-12 [&>*]:min-w-0"
          >
            <GalleryMostViewedPhotosSection
              photos={mostViewedPhotos}
            />
            <GalleryTrendingAlbumsSection
              albums={mostViewedAlbums}
            />
            <GalleryRecentPhotosSection
              photos={recentPhotos}
            />
            <GalleryRecentAlbumsSection
              albums={recentAlbums}
            />
            <SignUpCTA
              variant="inline"
              className="max-w-screen-md mx-auto"
            />
          </div>
        </WidePageContainer>
      </div>
    </>
  );
}
