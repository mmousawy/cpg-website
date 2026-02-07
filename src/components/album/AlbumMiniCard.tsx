import Link from 'next/link';
import FolderSVG from 'public/icons/folder.svg';

import BlurImage from '../shared/BlurImage';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';

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

interface AlbumMiniCardProps {
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  href: string;
  /** Number of photos in the album */
  photoCount?: number;
  /** Created date of the album */
  createdAt?: string | null;
  /** Highlight this album (e.g., current album context) */
  highlighted?: boolean;
  className?: string;
}

/**
 * Small inline album card with thumbnail and name
 * Used for showing albums a photo is part of
 */
export default function AlbumMiniCard({
  title,
  coverImageUrl,
  href,
  photoCount,
  createdAt,
  highlighted = false,
  className = '',
}: AlbumMiniCardProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 min-w-32 border pr-3 text-sm transition-colors border-border-color-strong hover:border-primary hover:text-primary ${
        className} ${
        highlighted
          ? 'bg-background-light'
          : 'bg-background-medium'
      }`}
    >
      <div
        className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden bg-background"
      >
        {coverImageUrl ? (
          <BlurImage
            src={getSquareThumbnailUrl(coverImageUrl, 64, 85) || coverImageUrl}
            alt={title}
            fill
            sizes="76px"
            className="object-cover"
          />
        ) : (
          <FolderSVG
            className="size-6 text-foreground/30"
          />
        )}
      </div>
      <div
        className="flex flex-col gap-0.5"
      >
        <span
          className="text-sm font-medium line-clamp-2 leading-none"
        >
          {title}
        </span>
        {createdAt && formatDate(createdAt) && (
          <span
            className="text-xs text-foreground/60"
          >
            {formatDate(createdAt)}
          </span>
        )}
      </div>
    </Link>
  );
}
