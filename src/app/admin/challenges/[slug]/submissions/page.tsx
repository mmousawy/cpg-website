'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import Avatar from '@/components/auth/Avatar';
import PageContainer from '@/components/layout/PageContainer';
import ArrowLink from '@/components/shared/ArrowLink';
import Button from '@/components/shared/Button';
import GridCheckbox from '@/components/shared/GridCheckbox';
import StickyActionBar from '@/components/shared/StickyActionBar';
import { useChallengeBySlug } from '@/hooks/useChallenges';
import {
  useBulkReviewSubmissions,
  useReviewSubmission,
  useSubmissionsForReview,
} from '@/hooks/useChallengeSubmissions';
import type { SubmissionForReview } from '@/types/challenges';
import { initPhotoSwipe, type PhotoSwipeLightboxInstance } from '@/utils/photoswipe';

import CancelSVG from 'public/icons/cancel.svg';
import CheckSVG from 'public/icons/check.svg';
import LinkSVG from 'public/icons/link.svg';
import MagnifyingGlassPlusSVG from 'public/icons/magnifying-glass-plus.svg';

type TabStatus = 'pending' | 'accepted' | 'rejected';

export default function ReviewQueuePage() {
  const params = useParams();
  const challengeSlug = params.slug as string;
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch challenge and submissions
  const { data: challenge, isLoading: isLoadingChallenge } =
    useChallengeBySlug(challengeSlug);
  const { data: submissions, isLoading: isLoadingSubmissions } =
    useSubmissionsForReview(challenge?.id, activeTab);

  const reviewMutation = useReviewSubmission();
  const bulkReviewMutation = useBulkReviewSubmissions();

  const isReviewing = reviewMutation.isPending || bulkReviewMutation.isPending;

  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === (submissions || []).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((submissions || []).map((s) => s.id)));
    }
  };

  const handleAccept = async (submissionId: string) => {
    const submission = submissions?.find((s) => s.id === submissionId);
    await reviewMutation.mutateAsync({
      submissionId,
      status: 'accepted',
      challengeSlug,
      photoShortId: submission?.photo?.short_id || '',
    });
  };

  const handleReject = async (submissionId: string) => {
    const reason = await promptRejectionReason();
    if (reason === null) return; // User cancelled

    const submission = submissions?.find((s) => s.id === submissionId);
    await reviewMutation.mutateAsync({
      submissionId,
      status: 'rejected',
      rejectionReason: reason || undefined,
      challengeSlug,
      photoShortId: submission?.photo?.short_id || '',
    });
  };

  const handleBulkAccept = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = await confirm({
      title: 'Accept selected submissions?',
      message: `Are you sure you want to accept ${selectedIds.size} submission${selectedIds.size !== 1 ? 's' : ''}?`,
      confirmLabel: 'Accept All',
      cancelLabel: 'Cancel',
    });

    if (!confirmed) return;

    const selectedSubmissions = submissions?.filter((s) => selectedIds.has(s.id)) || [];
    const photoShortIds = selectedSubmissions
      .map((s) => s.photo?.short_id)
      .filter((id): id is string => !!id);

    await bulkReviewMutation.mutateAsync({
      submissionIds: Array.from(selectedIds),
      status: 'accepted',
      challengeSlug,
      photoShortIds,
    });

    setSelectedIds(new Set());
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    const reason = await promptRejectionReason();
    if (reason === null) return;

    const selectedSubmissions = submissions?.filter((s) => selectedIds.has(s.id)) || [];
    const photoShortIds = selectedSubmissions
      .map((s) => s.photo?.short_id)
      .filter((id): id is string => !!id);

    await bulkReviewMutation.mutateAsync({
      submissionIds: Array.from(selectedIds),
      status: 'rejected',
      rejectionReason: reason || undefined,
      challengeSlug,
      photoShortIds,
    });

    setSelectedIds(new Set());
  };

  const promptRejectionReason = async (): Promise<string | null> => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return null;
    return reason;
  };

  const pendingCount = challenge?.pending_count || 0;
  const acceptedCount = challenge?.accepted_count || 0;
  const rejectedCount = challenge?.rejected_count || 0;

  const tabs: { key: TabStatus; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'accepted', label: 'Accepted', count: acceptedCount },
    { key: 'rejected', label: 'Rejected', count: rejectedCount },
  ];

  const isLoading = isLoadingChallenge || isLoadingSubmissions;

  return (
    <>
      <PageContainer
        className="flex-1"
      >
        {/* Header */}
        <div
          className="mb-6"
        >
          <ArrowLink
            href={`/challenges/${challengeSlug}`}
            direction="left"
            className="mb-4"
          >
            Back to challenge
          </ArrowLink>
          <h1
            className="text-2xl font-bold mb-2"
          >
            Review submissions
          </h1>
          {challenge && (
            <p
              className="text-foreground/60"
            >
              {challenge.title}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 mb-4 flex-wrap"
        >
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              variant={activeTab === tab.key ? 'primary' : 'secondary'}
              size="sm"
              className="pr-2.5"
            >
              {tab.label}
              {' '}
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-white/20'
                    : 'bg-foreground/10',
                )}
              >
                {tab.count}
              </span>
            </Button>
          ))}
        </div>

        {/* Bulk actions for pending tab */}
        {activeTab === 'pending' && (submissions || []).length > 0 && (
          <div
            className="flex items-center gap-3 mb-4"
          >
            <Button
              onClick={handleSelectAll}
              variant="secondary"
              size="sm"
              className="text-foreground/70"
            >
              {selectedIds.size === (submissions || []).length
                ? 'Deselect all'
                : 'Select all'}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div
            className="text-center py-12"
          >
            <p
              className="text-foreground/50 animate-pulse"
            >
              Loading submissions...
            </p>
          </div>
        ) : (submissions || []).length === 0 ? (
          <div
            className="text-center py-12"
          >
            <p
              className="text-foreground/60 mb-4"
            >
              No
              {' '}
              {activeTab}
              {' '}
              submissions
            </p>
            {activeTab === 'pending' && acceptedCount > 0 && (
              <Button
                variant="secondary"
                onClick={() => handleTabChange('accepted')}
              >
                View
                {' '}
                {acceptedCount}
                {' '}
                accepted submission
                {acceptedCount !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        ) : (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {(submissions || []).map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                isSelected={selectedIds.has(submission.id)}
                onSelect={() => handleSelect(submission.id)}
                onAccept={() => handleAccept(submission.id)}
                onReject={() => handleReject(submission.id)}
                showActions={activeTab === 'pending'}
                isReviewing={isReviewing}
              />
            ))}
          </div>
        )}
      </PageContainer>

      {/* Sticky bulk action bar */}
      {activeTab === 'pending' && selectedIds.size > 0 && (
        <StickyActionBar>
          <div
            className="flex items-center gap-3 max-w-screen-md w-full mx-auto"
          >
            <span
              className="text-sm flex-1 text-foreground/70"
            >
              {selectedIds.size}
              {' '}
              selected
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkReject}
              disabled={isReviewing}
              icon={<CancelSVG
                className="h-4 w-4"
              />}
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkAccept}
              disabled={isReviewing}
              icon={<CheckSVG
                className="h-4 w-4"
              />}
            >
              Accept
            </Button>

          </div>
        </StickyActionBar>
      )}
    </>
  );
}

// Submission card component
function SubmissionCard({
  submission,
  isSelected,
  onSelect,
  onAccept,
  onReject,
  showActions,
  isReviewing,
}: {
  submission: SubmissionForReview;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  showActions: boolean;
  isReviewing: boolean;
}) {
  const photo = submission.photo;
  const user = submission.user;
  const lightboxRef = useRef<PhotoSwipeLightboxInstance | null>(null);
  const isOpeningRef = useRef(false);

  // Cleanup lightbox on unmount
  useEffect(() => {
    return () => {
      if (lightboxRef.current) {
        try {
          lightboxRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        lightboxRef.current = null;
      }
    };
  }, []);

  const handleZoom = async () => {
    if (!photo?.url || isOpeningRef.current) return;

    isOpeningRef.current = true;

    // Clean up any existing lightbox
    if (lightboxRef.current) {
      try {
        lightboxRef.current.destroy();
      } catch {
        // Ignore cleanup errors
      }
      lightboxRef.current = null;
    }

    try {
      const PhotoSwipeLightbox = await initPhotoSwipe();

      const lightbox = new PhotoSwipeLightbox({
        gallery: `#submission-${submission.id}`,
        children: 'a',
        pswpModule: () => import('photoswipe'),
        showHideAnimationType: 'zoom',
      });

      lightboxRef.current = lightbox;

      lightbox.on('close', () => {
        isOpeningRef.current = false;
      });

      lightbox.init();
      lightbox.loadAndOpen(0);
    } catch (error) {
      console.error('Failed to open lightbox:', error);
      isOpeningRef.current = false;
      if (lightboxRef.current) {
        try {
          lightboxRef.current.destroy();
        } catch {
          // Ignore cleanup errors
        }
        lightboxRef.current = null;
      }
    }
  };

  return (
    <div
      className={`rounded-xl border bg-background-light p-3 transition-colors ${
        isSelected ? 'border-primary' : 'border-border-color'
      }`}
    >
      {/* Photo */}
      <div
        id={`submission-${submission.id}`}
        className="group relative aspect-square w-full overflow-hidden rounded-lg bg-background-medium"
      >
        {photo?.url ? (
          <>
            <a
              href={photo.url}
              data-pswp-width={photo.width || 1200}
              data-pswp-height={photo.height || 800}
              target="_blank"
              rel="noreferrer"
              className="block size-full"
              onClick={(e) => e.preventDefault()}
            >
              <Image
                src={photo.url}
                alt={photo.title || 'Submission'}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </a>
            {/* Action buttons */}
            <div
              className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {/* View photo page button */}
              {user?.nickname && photo?.short_id && (
                <Link
                  href={`/@${user.nickname}/photo/${photo.short_id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  title="View photo page"
                >
                  <LinkSVG
                    className="h-4 w-4 fill-current"
                  />
                </Link>
              )}
              {/* Zoom button */}
              <button
                onClick={handleZoom}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                title="View full size"
              >
                <MagnifyingGlassPlusSVG
                  className="h-4 w-4"
                />
              </button>
            </div>
          </>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-foreground/30"
          >
            No image
          </div>
        )}

        {/* Selection checkbox for pending */}
        {showActions && (
          <GridCheckbox
            isSelected={isSelected}
            onClick={() => onSelect()}
            alwaysVisible
          />
        )}
      </div>

      {/* User info */}
      <div
        className="flex items-center gap-2 mt-3"
      >
        <Button
          href={user?.nickname ? `/@${user.nickname}` : '#'}
          variant="ghost"
          size="sm"
          className="p-0! hover:bg-transparent"
          icon={
            <Avatar
              avatarUrl={user?.avatar_url}
              fullName={user?.full_name}
              size="xxs"
              hoverEffect
            />
          }
        >
          @
          {user?.nickname || user?.full_name || 'Unknown'}
        </Button>
        <span
          className="text-xs text-foreground/60 ml-auto"
        >
          {new Date(submission.submitted_at).toLocaleDateString()}
        </span>
      </div>

      {/* Actions for pending */}
      {showActions && (
        <div
          className="flex gap-2 justify-between mt-3"
        >
          <Button
            variant="danger"
            size="sm"
            className="px-2! py-1!"
            onClick={onReject}
            disabled={isReviewing}
            icon={<CancelSVG
              className="h-4 w-4"
            />}
          >
            Reject
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="px-2! py-1!"
            onClick={onAccept}
            disabled={isReviewing}
            icon={<CheckSVG
              className="h-4 w-4"
            />}
          >
            Accept
          </Button>
        </div>
      )}

      {/* Rejection reason for rejected tab */}
      {submission.status === 'rejected' && submission.rejection_reason && (
        <div
          className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300"
        >
          <span
            className="font-medium"
          >
            Reason:
          </span>
          {' '}
          {submission.rejection_reason}
        </div>
      )}
    </div>
  );
}
