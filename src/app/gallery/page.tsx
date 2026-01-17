import AlbumGrid from '@/components/album/AlbumGrid';
import PageContainer from '@/components/layout/PageContainer';
import WidePageContainer from '@/components/layout/WidePageContainer';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import PopularTagsSection from '@/components/shared/PopularTagsSection';
import { createMetadata } from '@/utils/metadata';

// Cached data functions
import { getPublicAlbums } from '@/lib/data/albums';
import { getPublicPhotostream } from '@/lib/data/gallery';

export const metadata = createMetadata({
  title: 'Gallery & Community Photo Albums',
  description:
    'Browse photo albums created by our community members. Explore beautiful photos from our photography meetups and community events.',
  canonical: '/gallery',
  keywords: ['photography gallery', 'photo albums', 'photography portfolio', 'community photos'],
});

export default async function GalleryPage() {
  // Fetch data in parallel
  const [albums, photos] = await Promise.all([getPublicAlbums(50), getPublicPhotostream(100)]);

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
        {/* Community photostream */}
        {photos.length > 0 && (
          <div
            className="mb-12"
          >
            <div
              className="mb-6"
            >
              <h2
                className="text-xl font-semibold"
              >
                Recent photos
              </h2>
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
          </div>
        )}

        {/* Album grid */}
        <div>
          <div
            className="mb-6"
          >
            <h2
              className="text-xl font-semibold"
            >
              Albums
            </h2>
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
            <AlbumGrid
              albums={albums}
              className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6"
            />
          )}
        </div>
      </WidePageContainer>
    </>
  );
}
