'use client';

import { useSyncExternalStore } from 'react';

import {
  hasReviewPreviewCookie,
} from '@/lib/memberReview/blockPreview';
import { useSession } from '@/hooks/useSession';

function subscribePreviewReview() {
  return () => {};
}

function getPreviewReviewSnapshot() {
  return hasReviewPreviewCookie(document.cookie);
}

function getServerPreviewReviewSnapshot() {
  return false;
}

export function useCanInteract() {
  const { isLoggedIn, profile } = useSession();
  const previewReview = useSyncExternalStore(
    subscribePreviewReview,
    getPreviewReviewSnapshot,
    getServerPreviewReviewSnapshot,
  );

  const isUnderReview = Boolean(profile?.under_review_at) || previewReview;
  return {
    isLoggedIn,
    isUnderReview,
    canInteract: isLoggedIn && !isUnderReview,
  };
}
