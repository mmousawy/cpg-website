import AlbumMiniCard from '@/components/album/AlbumMiniCard';
import ChallengeMiniCard from '@/components/challenges/ChallengeMiniCard';
import AlbumFilmstrip from '@/components/photo/AlbumFilmstrip';
import PhotoWithLightbox from '@/components/photo/PhotoWithLightbox';
import AuthorRow from '@/components/shared/AuthorRow';
import Comments from '@/components/shared/Comments';
import PhotoActionBar from '@/components/shared/PhotoActionBar';
import PhotoActionsPopover from '@/components/shared/PhotoActionsPopover';
import TagsSection from '@/components/shared/TagsSection';
import ViewTracker from '@/components/shared/ViewTracker';
import type { Photo, SimpleTag } from '@/types/photos';
import { getExifSummary } from '@/utils/exif';
import clsx from 'clsx';
import CalendarTodayIcon from 'public/icons/calendar-today.svg';
import CameraApertureIcon from 'public/icons/camera-aperture.svg';

interface Album {
  id: string;
  title: string;
  slug: string;
  cover_image_url?: string | null;
  photo_count?: number;
  profile_nickname?: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  nickname: string;
  avatar_url: string | null;
}

interface Challenge {
  id: string;
  title: string;
  slug: string;
  cover_image_url?: string | null;
}

interface SiblingPhoto {
  shortId: string;
  url: string;
  blurhash: string | null;
  sortOrder: number;
}

interface PhotoPageContentProps {
  photo: Photo & { tags?: SimpleTag[] };
  profile: Profile;
  /** The album owner's nickname (for building album navigation URLs) */
  albumOwnerNickname?: string;
  /** The album this photo is being viewed from (for back link context) */
  currentAlbum?: Album;
  /** All albums this photo is part of */
  albums?: Album[];
  /** Challenges this photo was accepted in */
  challenges?: Challenge[];
  /** Sibling photos in the current album (for filmstrip navigation) */
  siblingPhotos?: SiblingPhoto[];
}

export default function PhotoPageContent({
  photo,
  profile,
  albumOwnerNickname,
  currentAlbum,
  albums = [],
  challenges = [],
  siblingPhotos,
}: PhotoPageContentProps) {
  const exifString = getExifSummary(photo.exif_data as Record<string, unknown> | null);
  const nickname = profile.nickname;
  // For album navigation URLs, use the album owner's nickname (album lives under their profile)
  const albumNickname = albumOwnerNickname || nickname;

  // Filter out current album from the list of other albums
  const otherAlbums = currentAlbum
    ? albums.filter((a) => a.id !== currentAlbum.id)
    : albums;

  return (
    <>
      {/* Desktop: Two-column layout, Mobile: Single column */}
      <div
        className="w-full px-4 pt-4 md:p-4 md:flex md:gap-4 md:items-stretch lg:p-8 lg:gap-8"
      >
        {/* Photo column - sticky on desktop, vertically centered */}
        <div
          className="md:flex-1 md:sticky md:self-start md:top-[90px] md:h-[calc(100vh-106px)] lg:top-[106px] lg:h-[calc(100vh-138px)] md:flex md:flex-col"
        >
          <div
            className="flex-1 flex items-center justify-center"
          >
            <PhotoWithLightbox
              url={photo.url}
              title={photo.title || ''}
              width={photo.width || 1200}
              height={photo.height || 800}
              blurhash={photo.blurhash || ''}
              isInAlbum={!!currentAlbum}
            />
          </div>
          {/* Filmstrip navigation - only show when viewing within an album */}
          {currentAlbum && siblingPhotos && siblingPhotos.length > 1 && (
            <div
              className="lg:translate-y-4"
            >
              <AlbumFilmstrip
                photos={siblingPhotos}
                currentPhotoShortId={photo.short_id}
                nickname={albumNickname}
                albumSlug={currentAlbum.slug}
              />
            </div>
          )}
        </div>

        {/* Metadata + Comments sidebar on desktop, below photo on mobile */}
        <div
          className={clsx('pt-4 pb-8 border-t border-t-border-color bg-background-light -mx-4 px-4 md:mt-0 md:pt-6 md:pb-6 md:mx-0 md:w-96 lg:w-128 md:shrink-0 md:border md:border-border-color md:px-6 md:rounded-lg md:flex md:flex-col relative',
            currentAlbum ? 'mt-2' : 'mt-4',
          )}
        >
          {/* More actions menu - top right */}
          <div
            className="absolute right-4 top-4 md:right-6 md:top-6"
          >
            <PhotoActionsPopover
              photoId={photo.id}
              photoTitle={photo.title}
              photoUserId={photo.user_id}
              storagePath={photo.storage_path}
            />
          </div>

          {/* Author row */}
          <div
            className="mb-6"
          >
            <AuthorRow
              profile={profile}
            />
          </div>

          {/* Title and Description */}
          {(photo.title || photo.description) && (
            <div
              className="mb-6"
            >
              {photo.title && (
                <h1
                  className="text-2xl md:text-xl font-bold mb-3"
                >
                  {photo.title}
                </h1>
              )}
              {photo.description && (
                <p
                  className="text-base md:text-sm opacity-80 whitespace-pre-wrap"
                >
                  {photo.description}
                </p>
              )}
            </div>
          )}

          {/* Date, Views, EXIF metadata and Tags - pushed to bottom */}
          <div
            className="mt-auto space-y-2 pt-4"
          >
            {/* Featured in challenges */}
            {challenges.length > 0 && (
              <div
                className="mb-4"
              >
                <p
                  className="mb-1.5 text-xs font-medium text-foreground/70"
                >
                  Featured in
                </p>
                <div
                  className="flex flex-wrap gap-2"
                >
                  {challenges.map((challenge) => (
                    <ChallengeMiniCard
                      key={challenge.id}
                      title={challenge.title}
                      slug={challenge.slug}
                      coverImageUrl={challenge.cover_image_url}
                      href={`/challenges/${challenge.slug}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Seen in albums */}
            {(currentAlbum || otherAlbums.length > 0) && (
              <div
                className="mb-4"
              >
                <p
                  className="mb-1.5 text-xs font-medium text-foreground/70"
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
                      href={`/@${currentAlbum.profile_nickname || albumNickname}/album/${currentAlbum.slug}`}
                      photoCount={currentAlbum.photo_count}
                      highlighted
                      ownerNickname={albumNickname !== nickname ? albumNickname : undefined}
                    />
                )}
                  {otherAlbums.map((album) => (
                    <AlbumMiniCard
                      key={album.id}
                      title={album.title}
                      slug={album.slug}
                      coverImageUrl={album.cover_image_url}
                      href={`/@${album.profile_nickname || nickname}/album/${album.slug}`}
                      photoCount={album.photo_count}
                      ownerNickname={album.profile_nickname && album.profile_nickname !== nickname ? album.profile_nickname : undefined}
                    />
                ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div
              className='flex items-center gap-4 flex-wrap'
            >
              <div
                className="flex items-center gap-1.5"
              >
                <CalendarTodayIcon
                  className="size-4 text-foreground/60 shrink-0 -mt-0.5"
                />
                <p
                  className="text-xs text-foreground/60"
                >
                  {new Date(photo.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                </p>
              </div>
              <ViewTracker
                type="photo"
                id={photo.id}
                initialCount={photo.view_count ?? 0}
                compact
              />
            </div>


            {/* EXIF metadata */}
            {exifString && (
              <div
                className="flex items-start gap-1.5"
              >
                <CameraApertureIcon
                  className="size-4 text-foreground/60 shrink-0 -mt-0.25"
                />
                <p
                  className="text-xs text-foreground/60"
                >
                  {exifString}
                </p>
              </div>
            )}

            {/* Tags */}
            <TagsSection
              tags={photo.tags || []}
              className="mt-4"
            />
          </div>

          {/* Action bar + Comments - at bottom on desktop, separate sections on mobile */}
          {/* Action bar + Comments */}
          <div
            className="pt-6 border-t border-border-color mt-6 space-y-3"
          >
            {/* Action bar - likes only (views shown above with date/exif) */}
            <PhotoActionBar
              entityType="photo"
              entityId={photo.id}
              initialLikesCount={photo.likes_count ?? 0}
            />

            {/* Comments */}
            <Comments
              photoId={photo.id}
            />
          </div>
        </div>
      </div>
    </>
  );
}
