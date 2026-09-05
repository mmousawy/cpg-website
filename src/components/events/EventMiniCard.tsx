import { formatEventDate } from '@/lib/events/format';
import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import clsx from 'clsx';
import Link from 'next/link';
import CalendarSVG from 'public/icons/calendar2.svg';
import LinkSVG from 'public/icons/link.svg';
import BlurImage from '../shared/BlurImage';

interface EventMiniCardProps {
  title: string;
  coverImageUrl?: string | null;
  href: string;
  /** Event date shown as a subtitle */
  date?: string | null;
  /** URL opened in a new tab via the link icon (defaults to href) */
  publicUrl?: string;
  className?: string;
}

/**
 * Small inline event card with thumbnail and name.
 * Used for showing the event linked to an event album.
 */
export default function EventMiniCard({
  title,
  coverImageUrl,
  href,
  date,
  publicUrl,
  className = '',
}: EventMiniCardProps) {
  const formattedDate = date ? formatEventDate(date, { includeYear: true, now: Date.now() }) : null;
  const openUrl = publicUrl ?? href;

  return (
    <div
      className={clsx(
        'group relative inline-flex w-fit min-w-32 max-w-54 border',
        'text-sm transition-colors',
        'border-border-color-strong hover:border-primary hover:text-primary',
        'bg-background-medium',
        className,
      )}
    >
      <Link
        href={href}
        className="inline-flex items-center gap-2.5 pr-2.5"
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
            <CalendarSVG
              className="size-6 fill-foreground/30"
            />
          )}
        </div>
        <div
          className="min-w-0 flex flex-1 flex-col gap-0.5"
        >
          <span
            className="text-sm font-medium line-clamp-2 leading-none pr-6"
          >
            {title}
          </span>
          {formattedDate && (
            <span
              className="text-xs text-foreground/60"
            >
              {formattedDate}
            </span>
          )}
        </div>
      </Link>
      {openUrl && (
        <Link
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-0.5 right-0.5 p-0.5 rounded hover:bg-foreground/10 transition-colors text-foreground/60 hover:text-foreground"
          title="Open event page"
          aria-label="Open event page"
        >
          <LinkSVG
            className="size-3"
          />
        </Link>
      )}
    </div>
  );
}
