'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import PageContainer from '@/components/layout/PageContainer';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import HelpLink from '@/components/shared/HelpLink';
import { useAuth } from '@/hooks/useAuth';
import { useAllMySubmissions, useWithdrawSubmission } from '@/hooks/useChallengeSubmissions';
import type { SubmissionWithDetails } from '@/types/challenges';

import ArrowRightSVG from 'public/icons/arrow-right.svg';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckCircleFilledSVG from 'public/icons/check-circle-filled.svg';
import CheckSVG from 'public/icons/check.svg';
import ClockMiniSVG from 'public/icons/clock-mini.svg';
import UndoSVG from 'public/icons/undo.svg';

/**
 * Format deadline countdown
 */
function formatDeadline(endsAt: string | null, serverNow: number): string | null {
  if (!endsAt) return null;

  const deadline = new Date(endsAt);
  const now = new Date(serverNow);
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return 'Ended on ' + deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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

export default function MyChallengesPage() {
  const { user } = useAuth();
  const { data: submissions, isLoading } = useAllMySubmissions(user?.id);
  const withdrawMutation = useWithdrawSubmission();
  const confirm = useConfirm();

  // Use lazy initialization to capture time only once on mount
  const [serverNow] = useState(() => Date.now());

  // Group submissions by status
  const pendingSubmissions = (submissions || []).filter((s) => s.status === 'pending');
  const acceptedSubmissions = (submissions || []).filter((s) => s.status === 'accepted');
  const rejectedSubmissions = (submissions || []).filter((s) => s.status === 'rejected');

  const handleWithdraw = async (submission: SubmissionWithDetails) => {
    const confirmed = await confirm({
      title: 'Withdraw submission?',
      message: 'Are you sure you want to withdraw this submission? You can resubmit later.',
      confirmLabel: 'Withdraw',
      cancelLabel: 'Keep',
      variant: 'danger',
    });

    if (confirmed) {
      withdrawMutation.mutate(submission.id);
    }
  };

  return (
    <PageContainer>
      <div
        className="mb-8"
      >
        <div
          className="flex items-center gap-2 mb-2"
        >
          <h1
            className="text-3xl font-bold"
          >
            My challenge submissions
          </h1>
          <HelpLink
            href="submit-challenge"
            label="Help with challenge submissions"
          />
        </div>
        <p
          className="text-base sm:text-lg opacity-70"
        >
          View and manage your photo challenge submissions
        </p>
      </div>

      <div
        className="space-y-8 sm:space-y-10"
      >
        {/* Accepted Submissions */}
        {acceptedSubmissions.length > 0 && (
          <section>
            <h2
              className="mb-4 text-lg font-semibold opacity-70"
            >
              Accepted
            </h2>
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {acceptedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  serverNow={serverNow}
                />
              ))}
            </div>
          </section>
        )}

        {/* Pending Submissions */}
        <section>
          <h2
            className="mb-4 text-lg font-semibold opacity-70"
          >
            Pending review
          </h2>
          {isLoading ? (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-background-light border border-border-color overflow-hidden"
                >
                  <div
                    className="aspect-16/10 bg-background-medium"
                  />
                  <div
                    className="p-4 space-y-2"
                  >
                    <div
                      className="h-4 bg-background-medium rounded w-3/4"
                    />
                    <div
                      className="h-3 bg-background-medium rounded w-1/2"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : pendingSubmissions.length === 0 ? (
            <div
              className="text-center py-12 rounded-2xl border border-dashed border-border-color bg-background-light/50"
            >
              <AwardStarMiniSVG
                className="h-12 w-12 fill-foreground/20 mx-auto mb-3"
              />
              <p
                className="text-foreground/70 mb-4"
              >
                No pending submissions
              </p>
              <Button
                href="/challenges"
                size="sm"
                iconRight={<ArrowRightSVG
                  className="-mr-1.5"
                />}
                className="rounded-full"
              >
                Browse challenges
              </Button>
            </div>
          ) : (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {pendingSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  serverNow={serverNow}
                  onWithdraw={() => handleWithdraw(submission)}
                  isWithdrawing={withdrawMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>

        {/* Rejected Submissions */}
        {rejectedSubmissions.length > 0 && (
          <section>
            <h2
              className="mb-4 text-lg font-semibold opacity-70"
            >
              Rejected
            </h2>
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {rejectedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  serverNow={serverNow}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}

function SubmissionCard({
  submission,
  serverNow,
  onWithdraw,
  isWithdrawing,
}: {
  submission: SubmissionWithDetails;
  serverNow: number;
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}) {
  const photo = submission.photo;
  const challenge = submission.challenge;
  const deadline = challenge?.ends_at ? formatDeadline(challenge.ends_at, serverNow) : null;
  const deadlineShort = challenge?.ends_at ? formatDeadlineShort(challenge.ends_at, serverNow) : null;
  const isEnded = deadline?.includes('Ended') || !challenge?.is_active;
  const photoHref = submission.user?.nickname && photo?.short_id
    ? `/@${submission.user.nickname}/photo/${photo.short_id}`
    : null;

  const statusConfigs = {
    pending: {
      badge: (
        <span
          className="flex items-center gap-1.5 rounded-full bg-amber-500/70 text-shadow-sm backdrop-blur-sm px-1.5 py-1 sm:px-2 text-xs font-semibold text-white border border-amber-500/90"
        >
          <ClockMiniSVG
            className="size-4 -ml-0.5 shrink-0 fill-current"
          />
          <span
            className="hidden sm:inline"
          >
            Pending
          </span>
        </span>
      ),
      accent: 'ring-amber-500',
    },
    accepted: {
      badge: (
        <span
          className="flex items-center gap-1.5 rounded-full bg-green-600/70 text-shadow-sm backdrop-blur-sm px-1.5 py-1 sm:px-2 text-xs font-semibold text-white border border-green-600/90"
        >
          <CheckSVG
            className="size-4 shrink-0 fill-current"
          />
          <span
            className="hidden sm:inline"
          >
            Accepted
          </span>
        </span>
      ),
      accent: 'ring-green-600',
    },
    rejected: {
      badge: (
        <span
          className="flex items-center gap-1.5 rounded-full bg-red-700/70 text-shadow-sm backdrop-blur-sm px-1.5 py-1 sm:px-2 text-xs font-semibold text-white border border-red-700/90"
        >
          <CancelSVG
            className="size-4 shrink-0 fill-current"
          />
          <span
            className="hidden sm:inline"
          >
            Rejected
          </span>
        </span>
      ),
      accent: 'ring-red-700',
    },
  };

  const statusConfig = statusConfigs[submission.status as keyof typeof statusConfigs] || statusConfigs.pending;

  return (
    <div
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-2xl transition-all',
        'bg-background-light border border-border-color',
        'hover:border-border-color-strong hover:shadow-lg',
      )}
    >
      {/* Cover Image Area - Challenge background with submitted photo overlay */}
      <div
        className="relative aspect-16/10 w-full overflow-hidden bg-background-medium"
      >
        {/* Challenge cover as background */}
        {challenge?.cover_image_url ? (
          <>
            <BlurImage
              src={challenge.cover_image_url}
              alt={challenge.title}
              fill
              className="object-cover brightness-90"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              blurhash={challenge.image_blurhash}
            />
            {/* Blur overlay */}
            <div
              className="absolute inset-0 backdrop-blur-sm"
              style={{
                WebkitMaskImage: 'radial-gradient(circle at center, transparent 60%, black 100%)',
                maskImage: 'radial-gradient(circle at center, transparent 60%, black)',
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-linear-to-br from-primary/20 via-primary/10 to-background-medium"
          />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-black/40"
        />

        {/* Submitted photo - centered and featured */}
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
        >
          <div
            className={clsx(
              'relative h-full aspect-square rounded-xl overflow-hidden shadow-2xl ring-2 ring-offset-2 ring-offset-black/50',
              statusConfig.accent,
            )}
          >
            {photo?.url ? (
              <>
                <BlurImage
                  src={photo.url}
                  alt={photo.title || 'Submitted photo'}
                  fill
                  className="object-cover"
                  sizes="200px"
                  blurhash={photo.blurhash}
                />
                {photoHref && (
                  <Link
                    href={photoHref}
                    className="absolute inset-0 z-10"
                  />
                )}
              </>
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-background-medium text-foreground/30"
              >
                ?
              </div>
            )}
          </div>
        </div>

        {/* Top badges row */}
        <div
          className="absolute inset-x-0 top-0 flex items-start justify-between p-3"
        >
          {/* Challenge badge - icon only on mobile to save space */}
          <div
            className="flex items-center gap-1.5 rounded-full bg-challenge-badge/70 text-shadow-sm backdrop-blur-sm px-1.5 py-1 sm:px-2 text-xs font-medium text-white border border-challenge-badge/90"
          >
            <AwardStarMiniSVG
              className="size-4 fill-current shrink-0"
            />
            <span
              className="hidden sm:inline"
            >
              Challenge
            </span>
          </div>

          {/* Status badge */}
          {statusConfig.badge}
        </div>
      </div>

      {/* Content */}
      <div
        className="flex flex-col gap-2 p-4"
      >
        {/* Challenge title */}
        {challenge && (
          <Link
            href={`/challenges/${challenge.slug}`}
            className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
          >
            {challenge.title}
          </Link>
        )}

        {/* Deadline badge - short on mobile */}
        {!isEnded && deadline && deadlineShort && (
          <div
            className="flex items-center gap-1.5 text-xs text-foreground/70"
          >
            <ClockMiniSVG
              className="size-4 fill-current shrink-0"
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
        )}

        {/* Meta info */}
        <div
          className="flex items-center justify-between text-xs text-foreground/70"
        >
          <span
            className="flex items-center gap-1.5"
          >
            <CheckCircleFilledSVG
              className="size-4 fill-current shrink-0"
            />
            <span
              className="hidden sm:inline"
            >
              Submitted
              {' '}
              {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span
              className="sm:hidden"
            >
              {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </span>
        </div>

        {/* Withdraw button for pending */}
        {submission.status === 'pending' && onWithdraw && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onWithdraw}
            disabled={isWithdrawing}
            icon={<UndoSVG
              className="h-3.5 w-3.5"
            />}
            className="mt-2"
          >
            Withdraw
          </Button>
          )}

        {/* Rejection reason */}
        {submission.status === 'rejected' && submission.rejection_reason && (
          <p
            className="text-xs text-red-500/80 bg-red-500/10 rounded-lg px-3 py-2"
          >
            <strong>
              Reason:
            </strong>
            {' '}
            {submission.rejection_reason}
          </p>
        )}
      </div>
    </div>
  );
}
