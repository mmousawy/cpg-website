import AlbumSharedActions from '@/components/albums/AlbumSharedActions';
import EventMiniCard from '@/components/events/EventMiniCard';
import FullSizeGalleryButton from '@/components/photo/FullSizeGalleryButton';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import AlbumActionsPopover from '@/components/shared/AlbumActionsPopover';
import AuthorRow from '@/components/shared/AuthorRow';
import Comments from '@/components/shared/Comments';
import DetailSidebar, {
  DetailSidebarAuthor,
  DetailSidebarFooter,
  DetailSidebarMeta,
  DetailSidebarTitle,
} from '@/components/shared/DetailSidebar';
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
          // Desktop: page-level scroll; gallery grows with the grid
          'md:min-h-[calc(100svh-74px)] md:flex-row md:items-start md:gap-4 md:p-4',
          'lg:gap-8 lg:p-8',
        )}
      >
        {/* Gallery column - vertically centers content when short */}
        <div
          className={clsx(
            'relative flex w-full flex-col justify-center',
            'md:min-h-[calc(100svh-106px)] md:flex-1',
            'lg:min-h-[calc(100svh-138px)]',
          )}
        >
          {photos.length === 0 ? (
            <EmptyState
              className="min-h-48"
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

          {/* Full Size Gallery Button */}
          {photos.length > 0 && (
            <div
              className="sticky bottom-4 z-20 mt-4 flex justify-center md:bottom-6 md:mt-6"
            >
              <FullSizeGalleryButton
                photos={photos}
                className="text-xs bg-background/70 dark:bg-border-color/70 backdrop-blur-md hover:bg-background/90! dark:hover:bg-border-color/90!"
              />
            </div>
          )}
        </div>

        {/* Sidebar - sticky, scrollable */}
        <DetailSidebar
          sticky
          actions={(
            <AlbumActionsPopover
              albumId={album.id}
              albumTitle={album.title}
              albumUserId={album.user_id ?? null}
            />
          )}
        >
          {album.profile && (
            <DetailSidebarAuthor>
              <AuthorRow
                profile={{
                  full_name: album.profile?.full_name || null,
                  nickname: album.profile?.nickname || nickname,
                  avatar_url: album.profile?.avatar_url || null,
                }}
              />
            </DetailSidebarAuthor>
          )}

          <DetailSidebarTitle
            title={album.title}
            description={album.description}
          />

          <DetailSidebarMeta>
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
            <div
              className="flex items-center gap-4 flex-wrap"
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
                  {(() => { const d = new Date(album.created_at || ''); return d.toLocaleDateString('en-US', { year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric', month: 'long', day: 'numeric' }); })()}
                </p>
              </div>
              <ViewTracker
                type="album"
                id={album.id}
                compact
              />
            </div>

            <TagsSection
              tags={(album.tags || []) as SimpleTag[]}
              className="mt-4"
            />
          </DetailSidebarMeta>

          <DetailSidebarFooter>
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
            <PhotoActionBar
              entityType="album"
              entityId={album.id}
              initialLikesCount={album.likes_count ?? 0}
              share={shareData}
            />

            <Comments
              albumId={album.id}
            />
          </DetailSidebarFooter>
        </DetailSidebar>
      </div>
    </>
  );
}
