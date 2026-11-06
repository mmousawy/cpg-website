'use client';

import { useEffect, useState } from 'react';

import {
  hasReviewPreviewCookie,
} from '@/lib/memberReview/blockPreview';
import { useSession } from '@/hooks/useSession';

export function useCanInteract() {
  const { isLoggedIn, profile } = useSession();
  const [previewReview, setPreviewReview] = useState(false);

  useEffect(() => {
    setPreviewReview(hasReviewPreviewCookie(document.cookie));
  }, []);

  const isUnderReview = Boolean(profile?.under_review_at) || previewReview;
  return {
    isLoggedIn,
    isUnderReview,
    canInteract: isLoggedIn && !isUnderReview,
  };
}
