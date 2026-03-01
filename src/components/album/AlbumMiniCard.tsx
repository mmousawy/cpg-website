import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import Link from 'next/link';
import FolderSVG from 'public/icons/folder.svg';
import LinkSVG from 'public/icons/link.svg';
import BlurImage from '../shared/BlurImage';

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
  /** URL to the public album page (shown as link icon button) */
  publicUrl?: string;
  /** Number of photos in the album */
  photoCount?: number;
  /** Created date of the album */
  createdAt?: string | null;
  /** Highlight this album (e.g., current album context) */
  highlighted?: boolean;
  className?: string;
  /** Album owner nickname (shown when album belongs to another user) */
  ownerNickname?: string | null;
}

/**
 * Small inline album card with thumbnail and name
 * Used for showing albums a photo is part of
 */
export default function AlbumMiniCard({
  title,
  coverImageUrl,
  href,
  publicUrl,
  photoCount,
  createdAt,
  highlighted = false,
  className = '',
  ownerNickname,
}: AlbumMiniCardProps) {
  return (
    <Link
      href={href}
      className={clsx(
        'group relative inline-flex items-center gap-2.5 w-fit min-w-32 max-w-54 border pr-2.5',
        'text-sm transition-colors',
        'border-border-color-strong hover:border-primary hover:text-primary',
        highlighted ? 'bg-background-light' : 'bg-background-medium',
        className,
      )}
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
      {publicUrl && (
        <Link
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-0.5 right-0.5 p-0.5 rounded hover:bg-foreground/10 transition-colors text-foreground/60 hover:text-foreground"
          title="Open album page"
          aria-label="Open album page"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkSVG
            className="size-3"
          />
        </Link>
      )}
      <div
        className="min-w-0 flex-1 flex-col gap-0.5"
      >
        <span
          className="text-sm font-medium line-clamp-2 leading-none pr-6"
        >
          {title}
        </span>
        {ownerNickname && (
          <span
            className="text-xs text-foreground/50"
          >
            @
            {ownerNickname}
          </span>
        )}
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
