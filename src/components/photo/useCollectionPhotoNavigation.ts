'use client';

import { useProgressRouter } from '@/components/layout/NavigationProgress';
import { usePhotoNavigation } from '@/components/photo/PhotoNavigationContext';
import { isPhotoSwipeOpen } from '@/utils/photoswipe';
import { useCallback, useMemo } from 'react';

type CollectionPhoto = {
  shortId: string;
};

export function useCollectionPhotoNavigation({
  photos,
  currentPhotoShortId,
  getPhotoHref,
}: {
  photos: CollectionPhoto[];
  currentPhotoShortId: string;
  getPhotoHref: (shortId: string) => string;
}) {
  const router = useProgressRouter();
  const { pendingShortId, setPendingShortId } = usePhotoNavigation();

  const currentIndex = photos.findIndex((photo) => photo.shortId === currentPhotoShortId);
  const photoCount = photos.length;
  const canWrap = photoCount > 1 && currentIndex >= 0;

  const { prevIndex, nextIndex } = useMemo(() => {
    if (!canWrap) {
      return { prevIndex: -1, nextIndex: -1 };
    }
    return {
      prevIndex: currentIndex === 0 ? photoCount - 1 : currentIndex - 1,
      nextIndex: currentIndex === photoCount - 1 ? 0 : currentIndex + 1,
    };
  }, [canWrap, currentIndex, photoCount]);

  const hasPrev = prevIndex >= 0;
  const hasNext = nextIndex >= 0;

  const navigateToPhoto = useCallback((shortId: string) => {
    if (isPhotoSwipeOpen()) return;
    if (shortId === currentPhotoShortId || shortId === pendingShortId) return;
    setPendingShortId(shortId);
    router.push(getPhotoHref(shortId));
  }, [currentPhotoShortId, getPhotoHref, pendingShortId, router, setPendingShortId]);

  const goToPrevPhoto = useCallback(() => {
    if (!hasPrev) return;
    navigateToPhoto(photos[prevIndex].shortId);
  }, [hasPrev, navigateToPhoto, photos, prevIndex]);

  const goToNextPhoto = useCallback(() => {
    if (!hasNext) return;
    navigateToPhoto(photos[nextIndex].shortId);
  }, [hasNext, navigateToPhoto, photos, nextIndex]);

  return {
    currentIndex,
    prevIndex,
    nextIndex,
    hasPrev,
    hasNext,
    pendingShortId,
    setPendingShortId,
    navigateToPhoto,
    goToPrevPhoto,
    goToNextPhoto,
  };
}
