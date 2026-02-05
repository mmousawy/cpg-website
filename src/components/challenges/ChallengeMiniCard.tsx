import Link from 'next/link';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';

import { getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';
import BlurImage from '../shared/BlurImage';

interface ChallengeMiniCardProps {
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  href: string;
  /** Submission status */
  status?: 'accepted' | 'pending' | 'rejected';
  /** Whether to show the status label */
  showStatus?: boolean;
  className?: string;
}

/**
 * Small inline challenge card with thumbnail and name
 * Used for showing challenges a photo was submitted to
 */
export default function ChallengeMiniCard({
  title,
  coverImageUrl,
  href,
  status = 'accepted',
  showStatus = false,
  className = '',
}: ChallengeMiniCardProps) {
  const statusLabel = status === 'accepted' ? 'Accepted' : status === 'pending' ? 'Pending' : 'Rejected';
  const statusColor = status === 'accepted'
    ? 'text-green-600'
    : status === 'pending'
      ? 'text-amber-600'
      : 'text-red-500';

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 min-w-32 border pr-3 text-sm transition-colors border-border-color-strong hover:border-primary hover:text-primary bg-background-medium ${className}`}
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
          <AwardStarMiniSVG
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
        {showStatus && (
          <span
            className={`text-xs font-medium ${statusColor}`}
          >
            {statusLabel}
          </span>
        )}
      </div>
    </Link>
  );
}
