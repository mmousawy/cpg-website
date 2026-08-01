'use client';

import Link from 'next/link';

import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import Button from '@/components/shared/Button';
import SignUpCTA from '@/components/shared/SignUpCTA';
import TagCloud from '@/components/shared/TagCloud';
import { routes } from '@/config/routes';
import type { GalleryHomeData } from '@/lib/data/gallery';

type GalleryHomeSectionsProps = {
  data: GalleryHomeData;
};

export default function GalleryHomeSections({ data }: GalleryHomeSectionsProps) {
  const { albums, photos, mostViewedPhotos, mostViewedAlbums, popularTags } = data;

  return (
    <>
      {popularTags.length > 0 && (
        <PageContainer
          className="!pt-0"
        >
          <div
            className=""
          >
            <h2
              className="mb-3 text-xl font-semibold font-heading opacity-80"
            >
              Browse by tag
            </h2>
            <TagCloud
              tags={popularTags}
            />
          </div>
        </PageContainer>
      )}

      <WidePageContainer
        className="pt-0!"
      >
        {mostViewedPhotos.length > 0 && (
          <div
            className="mb-12"
          >
            <JustifiedPhotoGrid
              photos={mostViewedPhotos}
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
        )}

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
                  className="inline-block text-xl font-semibold group-hover:text-primary transition-colors font-heading"
                >
                  Trending albums
                </h2>
              </Link>
              <p
                className="text-foreground/80 mt-1 text-sm"
              >
                Most viewed albums from the last 7 days
              </p>
            </div>
            <AlbumGrid
              albums={mostViewedAlbums}
              liveLikeCounts={false}
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

        {photos.length > 0 && (
          <div
            className="mb-12"
          >
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
        )}

        <div>
          <div
            className="mb-6"
          >
            <Link
              href={routes.galleryAlbums.url}
              className="group"
            >
              <h2
                className="inline-block text-xl font-semibold group-hover:text-primary transition-colors font-heading"
              >
                Recent albums
              </h2>
            </Link>
            <p
              className="text-foreground/80 mt-1 text-sm"
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
                No albums yet. Be the first to create one!
              </p>
            </div>
          ) : (
            <>
              <AlbumGrid
                albums={albums}
                liveLikeCounts={false}
                className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6"
              />
              <div
                className="mt-6 flex justify-center"
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

        <SignUpCTA
          variant="inline"
          className="mt-10 max-w-screen-md mx-auto"
        />
      </WidePageContainer>
    </>
  );
}
