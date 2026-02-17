import AlbumSharedActions from '@/components/albums/AlbumSharedActions';
import FullSizeGalleryButton from '@/components/photo/FullSizeGalleryButton';
import JustifiedPhotoGrid from '@/components/photo/JustifiedPhotoGrid';
import AuthorRow from '@/components/shared/AuthorRow';
import Comments from '@/components/shared/Comments';
import AlbumActionsPopover from '@/components/shared/AlbumActionsPopover';
import PhotoActionBar from '@/components/shared/PhotoActionBar';
import TagsSection from '@/components/shared/TagsSection';
import ViewTracker from '@/components/shared/ViewTracker';
import { getPhotosByUrls, getProfilesByUserIds } from '@/lib/data/albums';
import type { Tables } from '@/database.types';
import type { AlbumJoinPolicy } from '@/types/albums';
import type { Photo, SimpleTag } from '@/types/photos';
import clsx from 'clsx';
import { cacheLife, cacheTag } from 'next/cache';
import CalendarTodayIcon from 'public/icons/calendar-today.svg';
import PhotoStackIcon from 'public/icons/photo-stack.svg';

import type { AlbumBySlugResult } from '@/lib/data/albums';

type AlbumContentProps = {
  album: AlbumBySlugResult;
  nickname: string;
  albumSlug: string;
};

export default async function AlbumContent({ album, nickname, albumSlug }: AlbumContentProps) {
  'use cache';

  // Apply cache settings
  cacheLife('max');
  cacheTag('albums');
  cacheTag(`profile-${nickname}`);
  cacheTag(`album-${nickname}-${albumSlug}`);

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

  return (
    <>
      {/* Desktop: Two-column layout, Mobile: Single column */}
      <div
        className={clsx(
          'w-full',
          // Mobile: padding and min-height
          'px-4 pt-4 min-h-[calc(100svh-57px)]',
          // Desktop: flex layout with gap
          'md:flex md:items-start md:gap-4 md:p-4 md:min-h-[calc(100svh-74px)]',
          // Large: more gap and padding
          'lg:gap-8 lg:p-8',
        )}
      >
        {/* Gallery column - vertically centers content when short */}
        <div
          className={clsx(
            'relative w-full flex flex-col justify-center',
            // Desktop: flex-1 with min-height for vertical centering
            'md:flex-1 md:min-h-[calc(100svh-105px)]',
            'lg:min-h-[calc(100svh-137px)]',
          )}
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
                showAttribution={isSharedAlbum}
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
                className="text-xs bg-background/70 dark:bg-border-color/70 backdrop-blur-md hover:bg-background/90! dark:hover:bg-border-color/90!"
              />
            </div>
          )}
        </div>

        {/* Sidebar - sticky, scrollable */}
        <div
          className={clsx(
            // Mobile: flows normally
            'mt-4 -mx-4 pt-4 pb-8 px-4',
            'border-t border-t-border-color bg-background-light',
            // Desktop: sticky sidebar with fixed width
            'md:mt-0 md:mx-0 md:w-96 lg:w-128 md:shrink-0',
            'md:sticky md:self-start md:overflow-y-auto',
            'md:top-[90px] lg:top-[106px] md:min-h-[calc(100svh-105px)] md:max-h-[calc(100svh-74px)]',
            'lg:min-h-[calc(100svh-137px)] lg:max-h-[calc(100svh-138px)]',
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
                  className="text-2xl md:text-xl font-bold mb-3"
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
                  {new Date(album.created_at || '').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {/* Views - live updating via ViewTracker */}
              <div>
                <ViewTracker
                  type="album"
                  id={album.id}
                  initialCount={album.view_count ?? 0}
                  compact
                />
              </div>
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
                isEventAlbum={!!album.event_id}
              />
            )}
            {/* Action bar - likes only (views shown above with date) */}
            <PhotoActionBar
              entityType="album"
              entityId={album.id}
              initialLikesCount={album.likes_count ?? 0}
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
