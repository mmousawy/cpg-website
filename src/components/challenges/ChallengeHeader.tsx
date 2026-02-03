import BlurImage from '@/components/shared/BlurImage';
import type { ChallengeWithStats } from '@/types/challenges';

import AwardStarSVG from 'public/icons/award-star.svg';
import CalendarSVG from 'public/icons/calendar2.svg';
import ClockSVG from 'public/icons/time.svg';

type ChallengeHeaderProps = {
  challenge: ChallengeWithStats;
  serverNow: number;
  isEnded: boolean;
};

/**
 * Format deadline countdown
 */
function formatDeadline(endsAt: string | null, serverNow: number): string | null {
  if (!endsAt) return null;

  const deadline = new Date(endsAt);
  const now = new Date(serverNow);
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 7) {
    return `${Math.ceil(days / 7)} weeks left`;
  } else if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  } else {
    return 'Ending soon';
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ChallengeHeader({
  challenge,
  serverNow,
  isEnded,
}: ChallengeHeaderProps) {
  const deadline = formatDeadline(challenge.ends_at, serverNow);

  return (
    <div
      className="space-y-6"
    >
      {/* Cover Image */}
      {challenge.cover_image_url && (
        <div
          className="relative aspect-21/9 w-full overflow-hidden rounded-xl bg-background-medium"
        >
          <BlurImage
            src={challenge.cover_image_url}
            alt={challenge.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
            blurhash={challenge.image_blurhash}
            priority
          />
        </div>
      )}

      {/* Title and Prompt */}
      <div>
        <div
          className="flex items-start justify-between gap-4"
        >
          <h1
            className="text-3xl font-bold"
          >
            {challenge.title}
          </h1>
          {isEnded && (
            <span
              className="shrink-0 rounded-full bg-foreground/10 px-3 py-1 text-sm font-medium"
            >
              Ended
            </span>
          )}
        </div>
        <p
          className="mt-3 text-lg text-foreground/80 whitespace-pre-wrap"
        >
          {challenge.prompt}
        </p>
      </div>

      {/* Stats Bar */}
      <div
        className="flex flex-wrap items-center gap-4 text-sm text-foreground/70"
      >
        {/* Photo count */}
        <span
          className="flex items-center gap-1.5"
        >
          <AwardStarSVG
            className="h-4 w-4 fill-current"
          />
          {challenge.accepted_count || 0}
          {' '}
          photo
          {(challenge.accepted_count || 0) !== 1 ? 's' : ''}
          {' '}
          accepted
        </span>

        {/* Deadline */}
        {isEnded ? (
          <span
            className="flex items-center gap-1.5"
          >
            <CalendarSVG
              className="h-4 w-4"
            />
            Ended
            {' '}
            {formatDate(challenge.ends_at)}
          </span>
        ) : deadline ? (
          <span
            className="flex items-center gap-1.5 text-amber-500"
          >
            <ClockSVG
              className="h-4 w-4"
            />
            {deadline}
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 text-green-600"
          >
            <ClockSVG
              className="h-4 w-4"
            />
            Open indefinitely
          </span>
        )}

        {/* Pending submissions (visible if > 0) */}
        {!isEnded && challenge.pending_count && challenge.pending_count > 0 && (
          <span
            className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-600"
          >
            {challenge.pending_count}
            {' '}
            pending review
          </span>
        )}
      </div>
    </div>
  );
}
