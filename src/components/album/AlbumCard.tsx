import Link from 'next/link';
import FolderSVG from 'public/icons/folder.svg';

import type { AlbumWithPhotos } from '@/types/albums';

import Avatar from '../auth/Avatar';
import BlurImage from '../shared/BlurImage';
import CardBadges from '../shared/CardBadges';
import CardLikes from '../shared/CardLikes';

export type AlbumCardVariant = 'large' | 'compact'

type AlbumCardProps = {
  album: AlbumWithPhotos
  isOwner?: boolean
  variant?: AlbumCardVariant
  /** If provided, clicking the album will call this instead of navigating */
  onClick?: (album: AlbumWithPhotos) => void
  /** Like count to display */
  likesCount?: number
}

export default function AlbumCard({
  album,
  isOwner = false,
  variant = 'large',
  onClick,
  likesCount,
}: AlbumCardProps) {
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url;
  const photoCount = album.photos?.length || 0;

  // When isOwner but no onClick, link to the unified photos page
  // (the onClick prop is preferred when available for in-page navigation)
  const albumUrl = isOwner
    ? '/account/photos'
    : `/@${album.profile?.nickname || 'unknown'}/album/${album.slug}`;

  const cardContent = (
    <div
      className="group block overflow-hidden border border-border-color bg-background-light group-hover:shadow-lg group-focus:shadow-lg group-hover:border-border-color-strong group-focus:border-border-color-strong transition-all duration-200"
    >
      <div
        className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-background"
      >
        {coverImage ? (
          <BlurImage
            src={coverImage}
            alt={album.title}
            sizes="(max-width: 640px) 256px, (max-width: 1024px) 480px, 512px"
            quality={85}
            fill
            loading='lazy'
            className="object-cover group-hover:brightness-110 transition-all duration-200"
          />
        ) : (
          <FolderSVG
            className="size-16 text-foreground/20"
          />
        )}

        {/* Likes overlay */}
        <CardLikes
          likesCount={likesCount ?? album.likes_count ?? 0}
        />

        {/* Compact variant: hover overlays */}
        {variant === 'compact' && (
          <>
            {/* Top blur layer with gradient mask */}
            <div
              className="absolute inset-x-0 top-0 h-24 backdrop-blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
              }}
            />
            {/* Top gradient overlay */}
            <div
              className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"
            />

            {/* Bottom blur layer with gradient mask */}
            <div
              className="absolute inset-x-0 bottom-0 h-24 backdrop-blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"
              style={{
                WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
                maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
              }}
            />
            {/* Bottom gradient overlay */}
            <div
              className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"
            />

            {/* Title - top left, visible on hover */}
            <div
              className="absolute top-0 left-0 right-0 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"
            >
              <h3
                className="text-sm font-semibold text-white line-clamp-2 drop-shadow-md"
              >
                {album.title}
              </h3>
              {/* Photo count - top right, visible on hover */}
              {photoCount > 0 && (
                <div
                  className="text-xs text-white opacity-70"
                >
                  {photoCount}
                  {' '}
                  {photoCount === 1 ? 'photo' : 'photos'}
                </div>
              )}
            </div>

            {/* Bottom info bar - visible on hover, with right padding for likes */}
            <div
              className="absolute bottom-0 left-0 right-12 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100"
            >
              {/* Nickname - bottom left */}
              {album.profile && (
                <div
                  className="flex items-center gap-1 text-xs text-white drop-shadow-md"
                >
                  <Avatar
                    avatarUrl={album.profile.avatar_url}
                    fullName={album.profile.full_name}
                    size="xxs"
                  />
                  <span>
                    @
                    {album.profile.nickname}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Badges - on image for compact variant */}
        {variant === 'compact' && !album.is_public && isOwner && (
          <CardBadges
            badges={[{ label: 'Private', className: 'px-2 py-0.5', variant: 'private' }]}
          />
        )}
      </div>

      {/* Large variant: info section below image */}
      {variant === 'large' && (
        <div
          className="p-2.5"
        >
          <h3
            className="text-sm font-semibold line-clamp-1"
          >
            {album.title}
          </h3>
          <div
            className="flex items-center justify-between mt-1.5"
          >
            {album.profile && (
              <div
                className="flex items-center gap-1.5 text-xs text-foreground/70"
              >
                <Avatar
                  avatarUrl={album.profile.avatar_url}
                  fullName={album.profile.full_name}
                  size="xxs"
                />
                <span>
                  @
                  {album.profile.nickname}
                </span>
              </div>
            )}
            {photoCount > 0 && (
              <div
                className="text-xs text-foreground/50"
              >
                {photoCount}
                {' '}
                <span
                  className="hidden sm:inline"
                >
                  {photoCount === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            )}
          </div>
          {!album.is_public && isOwner && (
            <span
              className="mt-2 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
            >
              Private
            </span>
          )}
        </div>
      )}
    </div>
  );

  // If onClick is provided, use a button instead of Link
  if (onClick) {
    return (
      <button
        onClick={() => onClick(album)}
        className="group block w-full text-left"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      href={albumUrl}
      className="group block"
    >
      {cardContent}
    </Link>
  );
}
