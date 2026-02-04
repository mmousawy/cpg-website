import FullSizeGalleryButton from '@/components/photo/FullSizeGalleryButton';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import AuthorRow from '@/components/shared/AuthorRow';
import Comments from '@/components/shared/Comments';
import PhotoActionBar from '@/components/shared/PhotoActionBar';
import TagsSection from '@/components/shared/TagsSection';
import ViewCount from '@/components/shared/ViewCount';
import ViewTracker from '@/components/shared/ViewTracker';
import { getPhotosByUrls } from '@/lib/data/albums';
import type { AlbumWithPhotos } from '@/types/albums';
import type { Photo, SimpleTag } from '@/types/photos';
import { cacheLife, cacheTag } from 'next/cache';
import CalendarTodayIcon from 'public/icons/calendar-today.svg';
import PhotoStackIcon from 'public/icons/photo-stack.svg';

type AlbumContentProps = {
  album: NonNullable<Awaited<ReturnType<typeof import('@/lib/data/albums').getAlbumBySlug>>>;
  nickname: string;
  albumSlug: string;
};

export default async function AlbumContent({ album, nickname, albumSlug }: AlbumContentProps) {
  'use cache';

  // Apply cache settings
  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);

  const albumWithPhotos = album as unknown as AlbumWithPhotos;

  // Sort photos by sort_order
  const sortedAlbumPhotos = [...(albumWithPhotos.photos || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Fetch photo metadata using cached function
  const photoUrls = sortedAlbumPhotos.map((p) => p.photo_url);
  const photosData = await getPhotosByUrls(photoUrls);

  // Create a map of url -> photo for quick lookup
  const photosMap = new Map((photosData || []).map((p) => [p.url, p as Photo]));

  // Convert album_photos to Photo format, preserving sort order
  const photos: Photo[] = sortedAlbumPhotos
    .map((ap) => {
      const photo = photosMap.get(ap.photo_url);
      if (!photo) return null;
      return {
        ...photo,
        title: ap.title || photo.title,
      } as Photo;
    })
    .filter((p): p is Photo => p !== null);

  return (
    <>
      <ViewTracker
        type="album"
        id={albumWithPhotos.id}
      />

      {/* Desktop: Two-column layout, Mobile: Single column */}
      <div
        className="w-full px-4 pt-4 md:p-4 md:flex md:gap-4 md:items-start md:min-h-[calc(100vh-90px)] lg:p-8 lg:min-h-[calc(100vh-106px)]"
      >
        {/* Gallery column - vertically centered */}
        <div
          className="relative w-full md:flex-1 md:flex md:flex-col md:justify-center md:min-h-[calc(100vh-106px)] lg:min-h-[calc(100vh-138px)]"
        >
          {/* Gallery */}
          <div
            className="w-full"
          >
            {photos.length === 0 ? (
              <div
                className="rounded-lg border border-border-color bg-background-light p-12 text-center"
              >
                <p
                  className="opacity-70"
                >
                  This album doesn&apos;t have any photos yet.
                </p>
              </div>
            ) : (
              <JustifiedPhotoGrid
                photos={photos}
                profileNickname={nickname}
                albumSlug={albumSlug}
              />
            )}
          </div>

          {/* Full Size Gallery Button - sticky at bottom of gallery column */}
          {photos.length > 0 && (
            <div
              className="sticky bottom-4 mt-4 flex justify-center z-20 md:bottom-8"
            >
              <FullSizeGalleryButton
                photos={photos}
                className="text-xs shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Metadata + Comments sidebar on desktop, below gallery on mobile */}
        <div
          className="mt-4 pt-4 pb-8 border-t border-t-border-color bg-background-light -mx-4 px-4 md:mt-0 md:pt-6 md:pb-6 md:mx-0 md:w-96 md:shrink-0 md:border md:border-border-color md:px-6 md:rounded-lg md:flex md:flex-col md:min-h-[calc(100vh-106px)] lg:min-h-[calc(100vh-138px)]"
        >
          {/* Author row */}
          <div
            className="mb-6"
          >
            <AuthorRow
              profile={{
                full_name: albumWithPhotos.profile?.full_name || null,
                nickname: albumWithPhotos.profile?.nickname || nickname,
                avatar_url: albumWithPhotos.profile?.avatar_url || null,
              }}
            />
          </div>

          {/* Title and Description */}
          {(albumWithPhotos.title || albumWithPhotos.description) && (
            <div
              className="mb-6"
            >
              {albumWithPhotos.title && (
                <h1
                  className="text-2xl md:text-xl font-bold mb-3"
                >
                  {albumWithPhotos.title}
                </h1>
              )}
              {albumWithPhotos.description && (
                <p
                  className="text-base md:text-sm opacity-80 whitespace-pre-wrap"
                >
                  {albumWithPhotos.description}
                </p>
              )}
            </div>
          )}

          {/* Date, Views, Photo count and Tags - pushed to bottom */}
          <div
            className="mt-auto space-y-2 pt-4"
          >
            {/* Photo count */}
            <div>
              <div
                className="flex items-center gap-1.5"
              >
                <PhotoStackIcon
                  className="size-4 fill-foreground/60 shrink-0"
                />
                <p
                  className="text-xs text-foreground/60"
                >
                  {photos.length}
                  {' '}
                  {photos.length === 1 ? 'photo' : 'photos'}
                </p>
              </div>
            </div>
            {/* Date + Views */}
            <div
              className="flex items-center gap-4 flex-wrap"
            >
              <div
                className="flex items-center gap-1.5"
              >
                <CalendarTodayIcon
                  className="size-4 text-foreground/60 shrink-0"
                />
                <p
                  className="text-xs text-foreground/60"
                >
                  {new Date(albumWithPhotos.created_at || '').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {/* Views */}
              {(albumWithPhotos.view_count ?? 0) > 0 && (
                <div>
                  <ViewCount
                    count={albumWithPhotos.view_count ?? 0}
                    compact
                  />
                </div>
              )}
            </div>

            {/* Tags */}
            <TagsSection
              tags={(albumWithPhotos.tags || []) as SimpleTag[]}
              className="mt-4"
            />
          </div>

          {/* Action bar + Comments */}
          <div
            className="pt-6 border-t border-border-color mt-6 space-y-3"
          >
            {/* Action bar - likes only (views shown above with date) */}
            <PhotoActionBar
              entityType="album"
              entityId={albumWithPhotos.id}
              initialLikesCount={albumWithPhotos.likes_count ?? 0}
            />

            {/* Comments */}
            <Comments
              albumId={albumWithPhotos.id}
            />
          </div>
        </div>
      </div>
    </>
  );
}
