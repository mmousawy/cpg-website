import AlbumSharedActions from '@/components/albums/AlbumSharedActions';
import EventMiniCard from '@/components/events/EventMiniCard';
import FullSizeGalleryButton from '@/components/photo/FullSizeGalleryButton';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import AlbumActionsPopover from '@/components/shared/AlbumActionsPopover';
import AuthorRow from '@/components/shared/AuthorRow';
import Comments from '@/components/shared/Comments';
import EmptyState from '@/components/shared/EmptyState';
import PhotoActionBar from '@/components/shared/PhotoActionBar';
import TagsSection from '@/components/shared/TagsSection';
import ViewTracker from '@/components/shared/ViewTracker';
import type { Tables } from '@/database.types';
import { getPhotosByUrls, getProfilesByUserIds } from '@/lib/data/albums';
import type { AlbumJoinPolicy } from '@/types/albums';
import type { Photo, SimpleTag } from '@/types/photos';
import clsx from 'clsx';
import CalendarTodayIcon from 'public/icons/calendar-today.svg';
import ImageSVG from 'public/icons/image.svg';
import PhotoStackIcon from 'public/icons/photo-stack.svg';

import type { AlbumBySlugResult } from '@/lib/data/albums';
import { formatProfileDisplayName, getAbsoluteUrl, getSocialImageUrl } from '@/utils/metadata';

type AlbumContentProps = {
  album: AlbumBySlugResult;
  nickname: string;
  albumSlug: string;
};

export default async function AlbumContent({ album, nickname, albumSlug }: AlbumContentProps) {
  // Sort photos by sort_order
  const sortedAlbumPhotos = [...(album.photos || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Fetch photo metadata and owner profiles (for shared album attribution)
  const photoUrls = sortedAlbumPhotos
    .map((p) => p.photo_url)
    .filter((url): url is string => url != null);
  const isSharedAlbum = album.is_shared ?? false;
  const photosData = await getPhotosByUrls(photoUrls);
  const ownerProfilesMap = isSharedAlbum
    ? await getProfilesByUserIds((photosData ?? []).map((p) => p.user_id).filter((id): id is string => id != null))
    : new Map<string, Pick<Tables<'profiles'>, 'nickname' | 'full_name' | 'avatar_url'>>();

  const photosMap = new Map((photosData || []).map((p) => [p.url, p as Photo]));

  type PhotoWithContributor = Photo & {
    profile?: Pick<Tables<'profiles'>, 'nickname' | 'full_name' | 'avatar_url'> | null;
  };
  const photos: PhotoWithContributor[] = sortedAlbumPhotos
    .map((ap): PhotoWithContributor | null => {
      if (!ap.photo_url) return null;
      const photo = photosMap.get(ap.photo_url);
      if (!photo) return null;
      const ownerProfile = isSharedAlbum && photo.user_id
        ? ownerProfilesMap.get(photo.user_id)
        : undefined;
      return {
        ...photo,
        title: ap.title || photo.title,
        ...(ownerProfile && {
          profile: {
            nickname: ownerProfile.nickname,
            full_name: ownerProfile.full_name ?? null,
            avatar_url: ownerProfile.avatar_url ?? null,
          },
        }),
      };
    })
    .filter((p): p is PhotoWithContributor => p !== null);

  const firstPhotoUrl = sortedAlbumPhotos[0]?.photo_url ?? null;
  const ownerName = formatProfileDisplayName(album.profile?.full_name, album.profile?.nickname ?? nickname);
  const shareData = {
    url: getAbsoluteUrl(`/@${nickname}/album/${albumSlug}`),
    title: `Album: ${album.title} by ${ownerName}`,
    image: getSocialImageUrl(firstPhotoUrl),
  };

  return (
    <>
      {/* Desktop: Two-column layout, Mobile: Single column */}
      <div
        className={clsx(
          'flex w-full min-h-[calc(100svh-57px)] flex-col',
          'px-4 pt-4',
          // Desktop: fixed viewport height so the gallery column can fill and scroll
          'md:h-[calc(100svh-74px)] md:min-h-0 md:flex-row md:items-stretch md:gap-4 md:p-4',
          'lg:gap-8 lg:p-8',
        )}
      >
        {/* Gallery column - vertically centers content when short */}
        <div
          className={clsx(
            'relative flex min-h-0 w-full flex-1 flex-col overflow-hidden',
            'md:min-h-0',
          )}
        >
          {/* Gallery */}
          <div
            className="flex min-h-0 w-full flex-1 flex-col justify-center overflow-y-auto"
          >
            {photos.length === 0 ? (
              <EmptyState
                className="h-full min-h-48"
                icon={<ImageSVG
                  className="size-10 inline-block"
                />}
                title="This album doesn't have any photos yet."
              />
            ) : (
              <JustifiedPhotoGrid
                photos={photos}
                profileNickname={nickname}
                albumSlug={albumSlug}
                showAttribution={isSharedAlbum}
              />
            )}
          </div>

          {/* Full Size Gallery Button - pinned to bottom of gallery column */}
          {photos.length > 0 && (
            <div
              className="mt-4 flex shrink-0 justify-center z-20 md:mt-6"
            >
              <FullSizeGalleryButton
                photos={photos}
                className="text-xs bg-background/70 dark:bg-border-color/70 backdrop-blur-md hover:bg-background/90! dark:hover:bg-border-color/90!"
              />
            </div>
          )}
        </div>

        {/* Sidebar - sticky, scrollable */}
        <div
          className={clsx(
            // Mobile: flows normally below gallery
            'mt-4 -mx-4 shrink-0 pt-4 pb-8 px-4',
            'border-t border-t-border-color bg-background-light',
            // Desktop: sticky sidebar with fixed width, stretches to row height
            'md:mt-0 md:mx-0 md:w-96 lg:w-lg md:shrink-0',
            'md:sticky md:top-[90px] lg:top-[106px] md:max-h-[calc(100svh-74px)] md:overflow-y-auto',
            'lg:max-h-[calc(100svh-138px)]',
            // Desktop: card styling
            'md:pt-6 md:pb-6 md:px-6',
            'md:rounded-lg md:border md:border-border-color',
            // Flex layout for content
            'md:flex md:flex-col',
            // Relative positioning for absolute children
            'relative',
          )}
        >
          {/* More actions menu - top right */}
          <div
            className="absolute right-4 top-4 md:right-6 md:top-6"
          >
            <AlbumActionsPopover
              albumId={album.id}
              albumTitle={album.title}
              albumUserId={album.user_id ?? null}
            />
          </div>

          {/* Author row - hide for event albums (no owner) */}
          {album.profile && (
            <div
              className="mb-6"
            >
              <AuthorRow
                profile={{
                  full_name: album.profile?.full_name || null,
                  nickname: album.profile?.nickname || nickname,
                  avatar_url: album.profile?.avatar_url || null,
                }}
              />
            </div>
          )}

          {/* Title and Description */}
          {(album.title || album.description) && (
            <div
              className="mb-6"
            >
              {album.title && (
                <h1
                  className="text-2xl md:text-xl font-bold mb-3 font-heading"
                >
                  {album.title}
                </h1>
              )}
              {album.description && (
                <p
                  className="text-base md:text-sm opacity-80 whitespace-pre-wrap"
                >
                  {album.description}
                </p>
              )}
            </div>
          )}

          {/* Date, Views, Photo count and Tags - pushed to bottom */}
          <div
            className="mt-auto space-y-2 pt-4"
          >
            {album.event?.slug && (
              <div
                className="mb-4"
              >
                <p
                  className="mb-1.5 text-xs font-medium text-foreground/80"
                >
                  Linked event
                </p>
                <EventMiniCard
                  title={album.event.title || 'Event'}
                  coverImageUrl={album.event.cover_image}
                  href={`/events/${album.event.slug}`}
                  date={album.event.date}
                />
              </div>
            )}
            {/* Photo count */}
            <div>
              <div
                className="flex items-center gap-1.5"
              >
                <PhotoStackIcon
                  className="size-4 fill-foreground/80 shrink-0"
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
                  {(() => { const d = new Date(album.created_at || ''); return d.toLocaleDateString('en-US', { year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', month: 'long', day: 'numeric' }); })()}
                </p>
              </div>
              <ViewTracker
                type="album"
                id={album.id}
                compact
              />
            </div>

            {/* Tags */}
            <TagsSection
              tags={(album.tags || []) as SimpleTag[]}
              className="mt-4"
            />
          </div>

          {/* Action bar + Comments */}
          <div
            className="pt-6 border-t border-border-color mt-6 space-y-3"
          >
            {/* Shared album actions - Join and Add photos */}
            {album.is_shared && (
              <AlbumSharedActions
                albumId={album.id}
                albumSlug={albumSlug}
                albumTitle={album.title}
                ownerNickname={album.profile?.nickname ?? nickname}
                ownerId={album.user_id ?? undefined}
                joinPolicy={(album.join_policy as AlbumJoinPolicy | null) ?? null}
                maxPhotosPerUser={album.max_photos_per_user}
                eventId={album.event_id}
                isEventAlbum={!!album.event_id}
              />
            )}
            {/* Action bar - likes only (views shown above with date) */}
            <PhotoActionBar
              entityType="album"
              entityId={album.id}
              initialLikesCount={album.likes_count ?? 0}
              share={shareData}
            />

            {/* Comments */}
            <Comments
              albumId={album.id}
            />
          </div>
        </div>
      </div>
    </>
  );
}
