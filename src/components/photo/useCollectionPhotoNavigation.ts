'use client';

import { useProgressRouter } from '@/components/layout/NavigationProgress';
import { usePhotoNavigation } from '@/components/photo/PhotoNavigationContext';
import { isPhotoSwipeOpen } from '@/utils/photoswipe';
import { useCallback } from 'react';

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
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  const navigateToPhoto = useCallback((shortId: string) => {
    if (isPhotoSwipeOpen()) return;
    if (shortId === currentPhotoShortId || shortId === pendingShortId) return;
    setPendingShortId(shortId);
    router.push(getPhotoHref(shortId));
  }, [currentPhotoShortId, getPhotoHref, pendingShortId, router, setPendingShortId]);

  const goToPrevPhoto = useCallback(() => {
    if (!hasPrev) return;
    navigateToPhoto(photos[currentIndex - 1].shortId);
  }, [currentIndex, hasPrev, navigateToPhoto, photos]);

  const goToNextPhoto = useCallback(() => {
    if (!hasNext) return;
    navigateToPhoto(photos[currentIndex + 1].shortId);
  }, [currentIndex, hasNext, navigateToPhoto, photos]);

  return {
    currentIndex,
    hasPrev,
    hasNext,
    pendingShortId,
    setPendingShortId,
    navigateToPhoto,
    goToPrevPhoto,
    goToNextPhoto,
  };
}
