'use client';

import BlurImage from '@/components/shared/BlurImage';
import type { AlbumWithPhotos } from '@/types/albums';
import clsx from 'clsx';
import Link from 'next/link';
import FolderSVG from 'public/icons/folder.svg';
import LinkSVG from 'public/icons/link.svg';

/** Get display name for an album: title -> slug -> short id */
export function getAlbumDisplayName(album: AlbumWithPhotos): string {
  if (album.title) return album.title;
  if (album.slug) return album.slug;
  return album.id.slice(0, 8);
}

/** Format date in user-friendly format */
function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export type AlbumListItemVariant = 'compact' | 'detailed';

interface AlbumListItemProps {
  album: AlbumWithPhotos;
  /** 'compact' shows thumbnail + name, 'detailed' shows all metadata */
  variant?: AlbumListItemVariant;
  /** URL to the public album page (shown as link icon button in detailed view) */
  publicUrl?: string;
  className?: string;
}

/**
 * Reusable album list item component.
 * - Compact: Thumbnail, name
 * - Detailed: Thumbnail, name, photo count, visibility, creation date
 */
export default function AlbumListItem({
  album,
  variant = 'compact',
  publicUrl,
  className = '',
}: AlbumListItemProps) {
  const displayName = getAlbumDisplayName(album);
  const isDetailed = variant === 'detailed';
  const coverImage = album.cover_image_url || album.photos?.[0]?.photo_url;
  const photoCount = album.photos?.length || 0;

  return (
    <div
      className={`relative flex items-center gap-2 border border-border-color bg-background-medium p-0 ${className}`}
    >
      {isDetailed && publicUrl && (
        <Link
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-0.5 right-0.5 p-0.5 rounded hover:bg-foreground/10 transition-colors text-foreground/60 hover:text-foreground z-10"
          title="Open album page"
          aria-label="Open album page"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkSVG
            className="size-3.5"
          />
        </Link>
      )}
      <div
        className={clsx(
          'relative shrink-0 overflow-hidden bg-background flex items-center justify-center',
          variant === 'compact' ? 'size-12' : 'size-16',
        )}
      >
        {coverImage ? (
          <BlurImage
            src={coverImage}
            alt={displayName}
            blurhash={album.cover_image_blurhash}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <FolderSVG
            className="size-6 text-foreground/20"
          />
        )}
      </div>
      <div
        className="min-w-0 flex-1 py-1"
      >
        {/* Primary name (title or fallback) */}
        <p
          className="mb-0.5 line-clamp-1 text-sm font-medium leading-none pr-8"
          title={displayName}
        >
          {displayName}
        </p>

        {isDetailed ? (
          <div
            className="flex flex-wrap gap-1 text-xs text-foreground/50"
          >
            <div
              className="flex flex-col"
            >
              <p
                className="flex gap-1"
              >
                <span>
                  {photoCount}
                  {' '}
                  {photoCount === 1 ? 'photo' : 'photos'}
                </span>
                <span>
                  •
                </span>
                <span>
                  {album.is_public ? 'Public' : 'Private'}
                </span>
                {album.created_at && formatDate(album.created_at) && (
                  <>
                    <span>
                      •
                    </span>
                    <span>
                      {formatDate(album.created_at)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <p
            className="text-xs text-foreground/50"
          >
            {photoCount}
            {' '}
            {photoCount === 1 ? 'photo' : 'photos'}
          </p>
        )}
      </div>
    </div>
  );
}
