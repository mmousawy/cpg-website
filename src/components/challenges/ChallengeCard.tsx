'use client';

import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import StackedAvatarsPopover from '@/components/shared/StackedAvatarsPopover';
import type { ChallengeWithStats } from '@/types/challenges';
import clsx from 'clsx';
import Link from 'next/link';
import { useMemo } from 'react';

import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckCircleSVG from 'public/icons/check-circle.svg';
import ClockMiniSVG from 'public/icons/clock-mini.svg';
import EditSVG from 'public/icons/edit.svg';
import EyeSVG from 'public/icons/eye.svg';
import PhotoStackMiniSVG from 'public/icons/photo-stack-mini.svg';
import ClockSVG from 'public/icons/time.svg';

type ChallengeCardProps = {
  challenge: ChallengeWithStats;
  serverNow: number;
  isPast?: boolean;
  /** Show admin action buttons (Edit, Review) in footer */
  showAdminActions?: boolean;
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
    return `${Math.ceil(days / 7)} weeks`;
  } else if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return 'Ending soon';
  }
}

/** Short format for mobile */
function formatDeadlineShort(endsAt: string | null, serverNow: number): string | null {
  if (!endsAt) return null;
  const deadline = new Date(endsAt);
  const now = new Date(serverNow);
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 7) return `${Math.ceil(days / 7)}w`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return 'Soon';
}

/**
 * Format date for display (short)
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function ChallengeCard({
  challenge,
  serverNow,
  isPast = false,
  showAdminActions = false,
}: ChallengeCardProps) {
  const deadline = formatDeadline(challenge.ends_at, serverNow);
  const deadlineShort = formatDeadlineShort(challenge.ends_at, serverNow);
  const isEnded = deadline === 'Ended' || isPast;
  const photoCount = challenge.accepted_count || 0;

  // Transform contributors for StackedAvatarsPopover
  // Use id prefix as fallback when both full_name and nickname are null (e.g. incomplete profiles)
  const contributorAvatars = useMemo(() =>
    (challenge.contributors || []).map((c) => ({
      id: c.id,
      avatarUrl: c.avatar_url,
      fullName: c.full_name,
      nickname: c.nickname ?? (c.id ? c.id.slice(0, 2).toUpperCase() : null),
    })),
  [challenge.contributors]);

  const pendingCount = challenge.pending_count || 0;
  const rejectedCount = challenge.rejected_count || 0;

  const challengeLink = `/challenges/${challenge.slug}`;

  // Cover image content (reused)
  const coverImageContent = (
    <>
      {challenge.cover_image_url ? (
        <>
          <BlurImage
            src={challenge.cover_image_url}
            alt={challenge.title}
            fill
            className="object-cover transition-all duration-200 group-hover:brightness-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            blurhash={challenge.image_blurhash}
          />
          {/* Bottom blur layer with gradient mask */}
          <div
            className="absolute inset-x-0 bottom-0 h-32 backdrop-blur-md transition-opacity duration-200"
            style={{
              WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
              maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
            }}
          />
          {/* Bottom gradient overlay */}
          <div
            className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"
          />
        </>
      ) : (
        <>
          {/* Placeholder gradient background */}
          <div
            className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/10 to-background-medium"
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <AwardStarMiniSVG
              className="h-16 w-16 fill-primary/30"
            />
          </div>
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent"
          />
        </>
      )}

      {/* Top badges row */}
      <div
        className="absolute inset-x-0 top-0 flex items-start justify-between p-2"
      >
        {/* Challenge badge - icon only on mobile */}
        <div
          className="flex items-center gap-1.5 rounded-full bg-challenge-badge/70 text-shadow-sm backdrop-blur-sm px-1 py-1 sm:px-2 text-xs font-medium text-white border border-challenge-badge/90"
        >
          <AwardStarMiniSVG
            className="h-4 w-4 sm:-ml-0.5 shrink-0 fill-current"
          />
          <span
            className="hidden sm:inline"
          >
            Challenge
          </span>
        </div>

        {/* Deadline/Status badge - short on mobile */}
        {isEnded ? (
          <div
            className="flex items-center gap-1.5 rounded-full bg-black/50 px-1.5 py-1 sm:px-2 text-xs font-medium text-white/90 backdrop-blur-sm"
          >
            <ClockMiniSVG
              className="h-4 w-4 sm:-ml-0.5 shrink-0 fill-current"
            />
            <span
              className="hidden sm:inline"
            >
              Ended
              {' '}
              {formatDate(challenge.ends_at)}
            </span>
            <span
              className="sm:hidden"
            >
              Ended
            </span>
          </div>
        ) : deadline && deadlineShort ? (
          <div
            className="flex items-center gap-1.5 rounded-full bg-amber-500/70 text-shadow-sm backdrop-blur-sm px-1.5 py-1 sm:px-2 text-xs font-semibold text-white border border-amber-500/90"
          >
            <ClockMiniSVG
              className="h-4 w-4 sm:-ml-0.5 shrink-0 fill-current"
            />
            <span
              className="hidden sm:inline"
            >
              {deadline}
            </span>
            <span
              className="sm:hidden"
            >
              {deadlineShort}
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-1 rounded-full bg-green-600/70 px-1.5 py-1 sm:px-2.5 text-xs font-semibold text-white shadow-md text-shadow-sm backdrop-blur-sm border border-green-600/90"
          >
            <span>
              Open
            </span>
          </div>
        )}
      </div>

      {/* Bottom content overlay */}
      <div
        className="absolute inset-x-0 bottom-0 p-3"
      >
        <h3
          className="text-lg font-bold text-white drop-shadow-md line-clamp-2 decoration-2 underline-offset-2"
        >
          {challenge.title}
        </h3>
      </div>
    </>
  );

  // Card content (used for non-admin view only)
  const cardContent = (
    <>
      {/* Cover Image Area */}
      <div
        className="relative aspect-16/10 w-full overflow-hidden bg-background-medium flex-1"
      >
        {coverImageContent}
      </div>

      {/* Footer stats bar */}
      <div
        className="flex items-center justify-between px-3 py-3 text-xs font-medium text-foreground/70"
      >
        <div
          className="flex items-center gap-1.5"
        >
          <PhotoStackMiniSVG
            className="size-4 shrink-0 fill-current"
          />
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {photoCount > 0 && (
              <>
                <span
                  className="hidden sm:inline"
                >
                  {photoCount}
                  {' '}
                  submission
                  {photoCount !== 1 ? 's' : ''}
                </span>
                <span
                  className="sm:hidden"
                >
                  {photoCount}
                  {photoCount !== 1 ? ' photos' : ' photo'}
                </span>
              </>
            )}
            {!photoCount && (
              <>
                <span
                  className="hidden sm:inline"
                >
                  No submissions yet
                </span>
                <span
                  className="sm:hidden"
                >
                  None yet
                </span>
              </>
            )}
          </span>
        </div>

        {/* Contributors */}
        {contributorAvatars.length > 0 && (
          <StackedAvatarsPopover
            people={contributorAvatars}
            singularLabel=""
            pluralLabel=""
            emptyMessage="-"
            showInlineCount={false}
            showCountOnMobile={false}
            maxVisibleAvatars={5}
            maxVisibleAvatarsMobile={5}
            avatarSize="xxs"
            disablePopover
          />
        )}
      </div>
    </>
  );

  // Wrapper classes
  const wrapperClasses = clsx(
    'group relative flex flex-col overflow-hidden rounded-xl sm:rounded-2xl transition-all min-h-56 sm:min-h-64',
    'bg-background-light border border-border-color',
    'hover:border-border-color-strong hover:shadow-lg',
    isEnded && 'opacity-90',
  );

  // For admin view, use a div wrapper with clickable cover image only
  if (showAdminActions) {
    return (
      <div
        className={wrapperClasses}
      >
        {/* Cover Image Area - clickable link to challenge */}
        <Link
          href={challengeLink}
          className="relative aspect-16/10 w-full overflow-hidden bg-background-medium block flex-1"
        >
          {coverImageContent}
        </Link>

        {/* Footer stats bar */}
        <div
          className="flex items-center justify-between px-3 py-3 text-xs font-medium text-foreground/70"
        >
          <div
            className="flex items-center gap-3 py-1"
          >
            <span
              className="flex items-center gap-1 text-green-600"
            >
              <CheckCircleSVG
                className="size-3.5 shrink-0 fill-current"
              />
              <span
                className="hidden sm:inline"
              >
                {photoCount}
                {' '}
                accepted
              </span>
              <span
                className="sm:hidden"
              >
                {photoCount}
              </span>
            </span>
            <span
              className="flex items-center gap-1 text-amber-600"
            >
              <ClockSVG
                className="size-3.5 shrink-0 fill-current"
              />
              <span
                className="hidden sm:inline"
              >
                {pendingCount}
                {' '}
                pending
              </span>
              <span
                className="sm:hidden"
              >
                {pendingCount}
              </span>
            </span>
            {rejectedCount > 0 && (
              <span
                className="flex items-center gap-1 text-red-500"
              >
                <CancelSVG
                  className="size-3.5 shrink-0 fill-current"
                />
                <span
                  className="hidden sm:inline"
                >
                  {rejectedCount}
                  {' '}
                  rejected
                </span>
                <span
                  className="sm:hidden"
                >
                  {rejectedCount}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Admin actions row */}
        <div
          className="flex items-center gap-2 px-3 pb-3 justify-between"
        >
          <Button
            href={`/admin/challenges/${challenge.slug}`}
            size="sm"
            variant="secondary"
            icon={<EditSVG
              className="size-4 fill-current"
            />}
            className="py-1! px-2!"
          >
            Edit
          </Button>

          <Button
            href={`/admin/challenges/${challenge.slug}/submissions`}
            size="sm"
            variant="secondary"
            icon={<EyeSVG
              className="size-4 fill-current"
            />}
            className="py-1! px-2!"
          >
            Review
          </Button>
        </div>
      </div>
    );
  }

  // For regular view, entire card is a link
  return (
    <Link
      href={challengeLink}
      className={wrapperClasses}
    >
      {cardContent}
    </Link>
  );
}
