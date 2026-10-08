import { GalleryMostViewedPhotosSection } from '@/app/gallery/GalleryMostViewedPhotosSection';
import GalleryPageHeader from '@/app/gallery/GalleryPageHeader';
import { GalleryRecentAlbumsSection } from '@/app/gallery/GalleryRecentAlbumsSection';
import { GalleryRecentPhotosSection } from '@/app/gallery/GalleryRecentPhotosSection';
import { GalleryTagsSection } from '@/app/gallery/GalleryTagsSection';
import { GalleryTrendingAlbumsSection } from '@/app/gallery/GalleryTrendingAlbumsSection';
import { HomeBelowFoldE2ESwap } from '@/components/home/HomeBelowFoldE2ESwap';
import WidePageContainer from '@/components/layout/WidePageContainer';
import SignUpCTA from '@/components/shared/SignUpCTA';
import { getIncludeTestContent } from '@/lib/auth/includeTestContent';
import { getGalleryPageData } from '@/lib/data/galleryPage';
import { createMetadata } from '@/utils/metadata';
import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';

export const metadata = createMetadata({
  title: 'Community gallery',
  description:
    'Browse photo albums created by our community members. Explore beautiful photos from our photography meetups and community events.',
  canonical: '/gallery',
  keywords: ['photography gallery', 'photo albums', 'photography portfolio', 'community photos'],
});

export default function GalleryPage() {
  return (
    <>
      <div
        id="gallery-page"
      >
        <CachedGalleryPage
          includeTestContent={false}
        />
      </div>
      {/* Header read stays outside the cached shell so `/gallery` can prerender.
          Replacing the shell for every visitor remounted the grids and replayed
          the photo fade. */}
      <Suspense
        fallback={null}
      >
        <GalleryPageE2E />
      </Suspense>
    </>
  );
}

async function GalleryPageE2E() {
  const includeTestContent = await getIncludeTestContent();
  if (!includeTestContent) return null;

  return (
    <HomeBelowFoldE2ESwap
      targetId="gallery-page"
    >
      <CachedGalleryPage
        includeTestContent
      />
    </HomeBelowFoldE2ESwap>
  );
}

async function CachedGalleryPage({ includeTestContent }: { includeTestContent: boolean }) {
  'use cache';
  cacheLife('galleryPage');
  cacheTag('gallery-page');

  const {
    popularTags,
    mostViewedPhotos,
    mostViewedAlbums,
    recentPhotos,
    recentAlbums,
  } = await getGalleryPageData(includeTestContent);

  return (
    <div
      className="px-3 pt-0 sm:pt-8 md:px-12 md:pt-12"
    >
      <GalleryPageHeader />

      <div
        className="-mx-3 grid min-w-0 gap-10 md:-mx-12 md:gap-12 md:pb-12 [&>*]:min-w-0"
      >
        <GalleryTagsSection
          tags={popularTags}
        />

        <WidePageContainer
          className="py-0!"
        >
          <div
            className="grid min-w-0 gap-10 md:gap-12 *:min-w-0"
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
          </div>
          <SignUpCTA
            variant="inline"
            className="max-w-screen-md  mx-auto sm:mt-12"
          />
        </WidePageContainer>
      </div>
    </div>
  );
}
