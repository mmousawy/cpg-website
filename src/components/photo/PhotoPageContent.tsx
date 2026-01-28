import AlbumMiniCard from '@/components/album/AlbumMiniCard';
import PageContainer from '@/components/layout/PageContainer';
import PhotoWithLightbox from '@/components/photo/PhotoWithLightbox';
import Comments from '@/components/shared/Comments';
import ContentHeader from '@/components/shared/ContentHeader';
import DetailLikesSection from '@/components/shared/DetailLikesSection';
import TagsSection from '@/components/shared/TagsSection';
import ViewCount from '@/components/shared/ViewCount';
import ViewTracker from '@/components/shared/ViewTracker';
import type { Photo, SimpleTag } from '@/types/photos';

interface Album {
  id: string;
  title: string;
  slug: string;
  cover_image_url?: string | null;
  photo_count?: number;
}

interface Profile {
  id: string;
  full_name: string | null;
  nickname: string;
  avatar_url: string | null;
}

interface PhotoPageContentProps {
  photo: Photo & { tags?: SimpleTag[] };
  profile: Profile;
  /** The album this photo is being viewed from (for back link context) */
  currentAlbum?: Album;
  /** All albums this photo is part of */
  albums?: Album[];
}

function exifToString(exif: Record<string, unknown> | null): string | null {
  if (!exif) return null;

  const fields: string[] = [];

  if (exif.Make && exif.Model) {
    fields.push(`${exif.Make} ${exif.Model}`);
  } else if (exif.Make) {
    fields.push(String(exif.Make));
  } else if (exif.Model) {
    fields.push(String(exif.Model));
  }

  if (exif.LensModel) {
    fields.push(String(exif.LensModel));
  }

  const settings: string[] = [];
  if (exif.ISO) settings.push(`ISO ${exif.ISO}`);
  if (exif.FNumber) settings.push(`f/${exif.FNumber}`);
  if (exif.ExposureTime) {
    const exp = Number(exif.ExposureTime);
    settings.push(exp < 1 ? `1/${Math.round(1 / exp)}s` : `${exp}s`);
  }

  if (settings.length > 0) {
    fields.push(settings.join(' · '));
  }

  return fields.length ? fields.join(' · ') : null;
}

export default function PhotoPageContent({
  photo,
  profile,
  currentAlbum,
  albums = [],
}: PhotoPageContentProps) {
  const exif = photo.exif_data as Record<string, unknown> | null;
  const exifString = exifToString(exif);
  const nickname = profile.nickname;

  // Filter out current album from the list of other albums
  const otherAlbums = currentAlbum
    ? albums.filter((a) => a.id !== currentAlbum.id)
    : albums;

  return (
    <>
      <ViewTracker
        type="photo"
        id={photo.id}
      />
      <PageContainer>
        {/* Photo with lightbox */}
        <div
          className="mb-6"
        >
          <PhotoWithLightbox
            url={photo.url}
            title={photo.title}
            width={photo.width || 1200}
            height={photo.height || 800}
            blurhash={photo.blurhash}
          />
        </div>

        {/* Photo details - two column layout */}
        <ContentHeader
          title={photo.title}
          description={photo.description}
          profile={profile}
          date={photo.created_at}
          metadata={exifString ? [exifString] : []}
          leftContent={
            <>
              <DetailLikesSection
                entityType="photo"
                className={photo.title || photo.description ? 'mt-5 sm:mt-6' : ''}
                entityId={photo.id}
                initialCount={photo.likes_count ?? 0}
              />
              <ViewCount
                count={photo.view_count ?? 0}
                className="mt-2"
              />
              <TagsSection
                tags={photo.tags || []}
              />
              {(currentAlbum || otherAlbums.length > 0) && (
                <div
                  className="mt-5 sm:mt-6"
                >
                  <p
                    className="mb-2 text-sm font-medium"
                  >
                    Seen in
                  </p>
                  <div
                    className="flex flex-wrap gap-2"
                  >
                    {currentAlbum && (
                      <AlbumMiniCard
                        title={currentAlbum.title}
                        slug={currentAlbum.slug}
                        coverImageUrl={currentAlbum.cover_image_url}
                        href={`/@${nickname}/album/${currentAlbum.slug}`}
                        photoCount={currentAlbum.photo_count}
                        highlighted
                      />
                    )}
                    {otherAlbums.map((album) => (
                      <AlbumMiniCard
                        key={album.id}
                        title={album.title}
                        slug={album.slug}
                        coverImageUrl={album.cover_image_url}
                        href={`/@${nickname}/album/${album.slug}`}
                        photoCount={album.photo_count}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          }
        />
      </PageContainer>

      {/* Comments section */}
      <PageContainer
        variant="alt"
        className="border-t border-t-border-color"
      >
        <Comments
          photoId={photo.id}
        />
      </PageContainer>
    </>
  );
}
