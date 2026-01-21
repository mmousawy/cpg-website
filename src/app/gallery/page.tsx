import Link from 'next/link';

import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import Button from '@/components/shared/Button';
import PopularTagsSection from '@/components/shared/PopularTagsSection';
import { routes } from '@/config/routes';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getMostViewedAlbumsLastWeek, getPublicAlbums } from '@/lib/data/albums';
import { getMostViewedPhotosLastWeek, getPublicPhotostream } from '@/lib/data/gallery';

export const metadata = createMetadata({
  title: 'Gallery & Community Photo Albums',
  description:
    'Browse photo albums created by our community members. Explore beautiful photos from our photography meetups and community events.',
  canonical: '/gallery',
  keywords: ['photography gallery', 'photo albums', 'photography portfolio', 'community photos'],
});

export default async function GalleryPage() {
  // Fetch data in parallel
  const [albums, photos, mostViewedPhotos, mostViewedAlbums] = await Promise.all([
    getPublicAlbums(10),
    getPublicPhotostream(10),
    getMostViewedPhotosLastWeek(10),
    getMostViewedAlbumsLastWeek(10),
  ]);

  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-3xl font-bold"
          >
            Photography gallery
          </h1>
          <p
            className="text-lg opacity-70"
          >
            Explore beautiful photos from the community
          </p>
        </div>

        <PopularTagsSection />
      </PageContainer>

      <WidePageContainer
        className="!pt-0"
      >
        {/* Most viewed in last week - Photos */}
        {mostViewedPhotos.length > 0 && (
          <div
            className="mb-12"
          >
            <div
              className="mb-6"
            >
              <Link
                href={`${routes.galleryPhotos.url}?sort=popular`}
                className="group"
              >
                <h2
                  className="text-xl font-semibold group-hover:text-primary transition-colors"
                >
                  Most viewed this week
                </h2>
              </Link>
              <p
                className="text-foreground/60 mt-1 text-sm"
              >
                Popular photos from the last 7 days
              </p>
            </div>
            <JustifiedPhotoGrid
              photos={mostViewedPhotos}
              showAttribution
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
        )}

        {/* Most viewed in last week - Albums */}
        {mostViewedAlbums.length > 0 && (
          <div
            className="mb-12"
          >
            <div
              className="mb-6"
            >
              <Link
                href={`${routes.galleryAlbums.url}?sort=popular`}
                className="group"
              >
                <h2
                  className="text-xl font-semibold group-hover:text-primary transition-colors"
                >
                  Trending albums
                </h2>
              </Link>
              <p
                className="text-foreground/60 mt-1 text-sm"
              >
                Most viewed albums from the last 7 days
              </p>
            </div>
            <AlbumGrid
              albums={mostViewedAlbums}
              className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6"
            />
            <div
              className="mt-6 flex justify-center"
            >
              <Button
                href={`${routes.galleryAlbums.url}?sort=popular`}
                variant="secondary"
              >
                View all popular albums
              </Button>
            </div>
          </div>
        )}

        {/* Community photostream */}
        {photos.length > 0 && (
          <div
            className="mb-12"
          >
            <div
              className="mb-6"
            >
              <Link
                href={routes.galleryPhotos.url}
                className="group"
              >
                <h2
                  className="text-xl font-semibold group-hover:text-primary transition-colors"
                >
                  Recent photos
                </h2>
              </Link>
              <p
                className="text-foreground/60 mt-1 text-sm"
              >
                Latest uploads from the community
              </p>
            </div>
            <JustifiedPhotoGrid
              photos={photos}
              showAttribution
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
        )}

        {/* Album grid */}
        <div>
          <div
            className="mb-6"
          >
            <Link
              href={routes.galleryAlbums.url}
              className="group"
            >
              <h2
                className="text-xl font-semibold group-hover:text-primary transition-colors"
              >
                Albums
              </h2>
            </Link>
            <p
              className="text-foreground/60 mt-1 text-sm"
            >
              Photo collections from community members
            </p>
          </div>

          {albums.length === 0 ? (
            <div
              className="border-border-color bg-background-light rounded-lg border p-12 text-center"
            >
              <p
                className="text-lg opacity-70"
              >
                No photos yet. Be the first to upload some!
              </p>
            </div>
          ) : (
            <>
              <AlbumGrid
                albums={albums}
                className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6"
              />
              <div
                className="mt-6 flex justify-center"
              >
                <Button
                  href={routes.galleryAlbums.url}
                  variant="secondary"
                >
                  View all albums
                </Button>
              </div>
            </>
          )}
        </div>
      </WidePageContainer>
    </>
  );
}
