'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState } from 'react';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import ChallengesList from '@/components/challenges/ChallengesList';
import PageContainer from '@/components/layout/PageContainer';
import PageHeading from '@/components/layout/PageHeading';
import BlurImage from '@/components/shared/BlurImage';
import Button from '@/components/shared/Button';
import CardBadges from '@/components/shared/CardBadges';
import EmptyState from '@/components/shared/EmptyState';
import HelpLink from '@/components/shared/HelpLink';
import { useAuth } from '@/hooks/useAuth';
import { useAllMySubmissions, useWithdrawSubmission } from '@/hooks/useChallengeSubmissions';
import { useActiveChallenges } from '@/hooks/useChallenges';
import type { ChallengeStatus, SubmissionWithDetails } from '@/types/challenges';
import { DEFAULT_SUPABASE_IMAGE_QUALITY, getSquareThumbnailUrl } from '@/utils/supabaseImageLoader';

import ArrowRightSVG from 'public/icons/arrow-right.svg';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import ClockMiniSVG from 'public/icons/clock-mini.svg';
import UndoSVG from 'public/icons/undo.svg';

type ChallengeGroup = {
  challengeId: string;
  challenge: NonNullable<SubmissionWithDetails['challenge']>;
  submissions: SubmissionWithDetails[];
};

function groupSubmissionsByChallenge(submissions: SubmissionWithDetails[]): ChallengeGroup[] {
  const map = new Map<string, ChallengeGroup>();

  for (const submission of submissions) {
    const challenge = submission.challenge;
    if (!challenge) continue;

    const existing = map.get(challenge.id);
    if (existing) {
      existing.submissions.push(submission);
    } else {
      map.set(challenge.id, {
        challengeId: challenge.id,
        challenge,
        submissions: [submission],
      });
    }
  }

  return Array.from(map.values());
}

function groupHasPending(group: ChallengeGroup): boolean {
  return group.submissions.some((s) => s.status === 'pending');
}

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
    year: deadline.getFullYear() === now.getFullYear() ? undefined : 'numeric',
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

function isChallengeEnded(
  challenge: NonNullable<SubmissionWithDetails['challenge']>,
  now: number | null,
): boolean {
  if (!challenge.is_active) return true;
  if (now == null || !challenge.ends_at) return false;
  const deadline = formatDeadline(challenge.ends_at, now);
  return deadline?.includes('Ended') ?? false;
}

const JOINED_CARD_GRID = 'flex flex-col gap-4';

export default function MyChallengesPage() {
  const { user } = useAuth();
  const { data: submissions, isPending: submissionsPending } = useAllMySubmissions(user?.id);
  const { data: activeChallenges, isPending: activeChallengesPending } = useActiveChallenges();
  const withdrawMutation = useWithdrawSubmission();
  const confirm = useConfirm();

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    startTransition(() => {
      setNow(Date.now());
    });
  }, []);

  const allSubmissions = submissions ?? [];

  const { pendingGroups, yourGroups, joinedChallengeIds } = useMemo(() => {
    const groups = groupSubmissionsByChallenge(allSubmissions);
    const pending = groups.filter(groupHasPending);
    const yours = groups.filter((g) => !groupHasPending(g));
    const joinedIds = new Set(groups.map((g) => g.challengeId));
    return { pendingGroups: pending, yourGroups: yours, joinedChallengeIds: joinedIds };
  }, [allSubmissions]);

  const openChallenges = useMemo(() => {
    if (submissionsPending) return [];
    return (activeChallenges ?? []).filter((c) => !joinedChallengeIds.has(c.id));
  }, [activeChallenges, joinedChallengeIds, submissionsPending]);

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

  const hasJoinedChallenges = pendingGroups.length > 0 || yourGroups.length > 0;
  const isPageLoading = submissionsPending || (!hasJoinedChallenges && activeChallengesPending);

  const showGlobalEmpty = !isPageLoading
    && !hasJoinedChallenges
    && openChallenges.length === 0;

  return (
    <PageContainer>
      <PageHeading
        title="My challenges"
        description="View and manage your photo challenge submissions"
        aside={
          <HelpLink
            href="submit-challenge"
            label="Help with challenge submissions"
            size="lg"
            className="max-sm:m-0"
          />
        }
      />

      <div
        className="space-y-8 sm:space-y-10"
      >
        {isPageLoading ? (
          <div
            className="text-center animate-pulse py-12"
          >
            <p
              className="text-foreground/50"
            >
              Loading your challenges...
            </p>
          </div>
        ) : showGlobalEmpty ? (
          <EmptyState
            icon={<AwardStarMiniSVG
              className="size-10 fill-foreground/20 inline-block"
            />}
            title="No challenge submissions yet"
            action={(
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
            )}
          />
        ) : (
          <>
            {pendingGroups.length > 0 && (
              <section>
                <h2
                  className="mb-4 text-xl font-semibold opacity-80 font-heading"
                >
                  Pending review
                </h2>
                <div
                  className={JOINED_CARD_GRID}
                >
                  {pendingGroups.map((group) => (
                    <JoinedChallengeCard
                      key={group.challengeId}
                      group={group}
                      now={now}
                      onWithdraw={handleWithdraw}
                      isWithdrawing={withdrawMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {yourGroups.length > 0 && (
              <section>
                <h2
                  className="mb-4 text-xl font-semibold opacity-80 font-heading"
                >
                  Your challenges
                </h2>
                <div
                  className={JOINED_CARD_GRID}
                >
                  {yourGroups.map((group) => (
                    <JoinedChallengeCard
                      key={group.challengeId}
                      group={group}
                      now={now}
                      onWithdraw={handleWithdraw}
                      isWithdrawing={withdrawMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {openChallenges.length > 0 && (
              <section>
                <h2
                  className="mb-4 text-xl font-semibold opacity-80 font-heading"
                >
                  Open challenges
                </h2>
                <ChallengesList
                  challenges={openChallenges}
                  serverNow={now ?? Date.now()}
                  emptyMessage="No open challenges right now."
                />
              </section>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}

const statusAccent: Record<ChallengeStatus, string> = {
  pending: 'border-amber-500/60',
  accepted: 'border-green-600/60',
  rejected: 'border-red-700/60',
};

function submissionStatusBadge(status: ChallengeStatus) {
  if (status === 'accepted') {
    return {
      icon: <CheckSVG
        className="size-4 fill-current"
      />,
      variant: 'accepted' as const,
      tooltip: 'Accepted',
    };
  }
  if (status === 'rejected') {
    return {
      icon: <CancelSVG
        className="size-4 fill-current"
      />,
      variant: 'rejected' as const,
      tooltip: 'Rejected',
    };
  }
  return {
    icon: <ClockMiniSVG
      className="size-4 fill-current"
    />,
    variant: 'pending' as const,
    tooltip: 'Pending review',
  };
}

function JoinedChallengeCard({
  group,
  now,
  onWithdraw,
  isWithdrawing,
}: {
  group: ChallengeGroup;
  now: number | null;
  onWithdraw: (submission: SubmissionWithDetails) => void;
  isWithdrawing: boolean;
}) {
  const { challenge, submissions } = group;
  const challengeLink = `/challenges/${challenge.slug}`;
  const deadline = now != null && challenge.ends_at
    ? formatDeadline(challenge.ends_at, now)
    : null;
  const deadlineShort = now != null && challenge.ends_at
    ? formatDeadlineShort(challenge.ends_at, now)
    : null;
  const ended = isChallengeEnded(challenge, now);
  const canSubmitAnother = challenge.is_active && !ended;

  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
  );

  const deadlineLabel = ended
    ? (deadline ?? 'Ended')
    : (deadline ?? (challenge.is_active ? 'Open' : null));

  return (
    <article
      className={clsx(
        'flex flex-col overflow-hidden rounded-2xl transition-all sm:flex-row',
        'bg-background-light border border-border-color',
        'hover:border-border-color-strong hover:shadow-lg',
      )}
    >
      <Link
        href={challengeLink}
        className="relative min-h-28 w-full shrink-0 bg-background-medium sm:aspect-square sm:w-48 "
      >
        {challenge.cover_image_url ? (
          <BlurImage
            src={challenge.cover_image_url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 224px"
            blurhash={challenge.image_blurhash}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-primary/20 via-primary/10 to-background-medium"
          >
            <AwardStarMiniSVG
              className="size-8 fill-primary/30 sm:size-12"
            />
          </div>
        )}

        <div
          className="absolute inset-x-0 top-0 z-10 bg-linear-to-b from-black/85 via-black/40 to-transparent p-4 pb-12 sm:p-4 sm:pb-15"
        >
          <p
            className="font-heading text-xl font-semibold leading-tight text-white line-clamp-3 sm:text-xl"
          >
            {challenge.title}
          </p>
        </div>
        {deadlineLabel && (
          <span
            className={clsx(
              'absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold text-white sm:bottom-3 sm:right-3 sm:px-2 sm:py-1 sm:text-xs',
              ended
                ? 'border-black/90 bg-black/85'
                : deadline
                  ? 'border-amber-500/90 bg-amber-500/85'
                  : 'border-green-600/90 bg-green-600/85',
            )}
          >
            <ClockMiniSVG
              className="size-3 shrink-0 fill-current sm:size-3.5"
            />
            <span
              className="hidden sm:inline"
            >
              {deadlineLabel}
            </span>
            <span
              className="sm:hidden"
            >
              {ended ? 'Ended' : (deadlineShort ?? deadlineLabel)}
            </span>
          </span>
        )}
      </Link>

      <div
        className="flex min-w-0 flex-1 flex-col gap-4 p-5 pt-4 sm:px-5 sm:py-4"
      >
        <div
          className="flex flex-wrap gap-4 sm:gap-5"
        >
          {sortedSubmissions.map((submission) => {
            const photo = submission.photo;
            const photoHref = submission.user?.nickname && photo?.short_id
              ? `/@${submission.user.nickname}/photo/${photo.short_id}`
              : null;
            const status = submission.status as ChallengeStatus;
            const accent = statusAccent[status] ?? statusAccent.pending;

            return (
              <div
                key={submission.id}
                className="flex w-24 flex-col gap-2 sm:w-28"
              >
                <div
                  className={clsx(
                    'aspect-square border-2 bg-background-light p-0.5',
                    accent,
                  )}
                >
                  <div
                    className="relative size-full overflow-hidden"
                  >
                    {photo?.url ? (
                      <>
                        <BlurImage
                          src={getSquareThumbnailUrl(photo.url, 512, DEFAULT_SUPABASE_IMAGE_QUALITY) || photo.url}
                          alt={photo.title || 'Submitted photo'}
                          fill
                          className="object-cover"
                          sizes="256px"
                          quality={DEFAULT_SUPABASE_IMAGE_QUALITY}
                          blurhash={photo.blurhash}
                        />
                        {photoHref && (
                          <Link
                            href={photoHref}
                            className="absolute inset-0 z-10"
                            aria-label={photo.title || 'View submitted photo'}
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
                    <CardBadges
                      badges={[submissionStatusBadge(status)]}
                    />
                  </div>
                </div>

                {status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onWithdraw(submission)}
                    disabled={isWithdrawing}
                    className="inline-flex items-center gap-1 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <UndoSVG
                      className="size-3.5 shrink-0"
                    />
                    Withdraw
                  </button>
                )}

                {status === 'rejected' && submission.rejection_reason && (
                  <p
                    className="text-xs leading-snug text-red-500/80 line-clamp-3"
                  >
                    {submission.rejection_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <hr
          className="mt-auto border-border-color"
        />

        <div
          className="flex items-center justify-between gap-3 text-xs text-foreground/70"
        >
          <span>
            {submissions.length}
            {' '}
            {submissions.length === 1 ? 'submission' : 'submissions'}
          </span>
          {canSubmitAnother && (
            <Button
              href={challengeLink}
              variant="secondary"
              size="sm"
              className="shrink-0 px-2.5! py-1! text-xs!"
              iconRight={<ArrowRightSVG
                className="size-3.5 -ml-0.5"
              />}
            >
              Submit another
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
