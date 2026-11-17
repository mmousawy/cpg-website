'use client';

import { useProgressRouter } from '@/components/layout/NavigationProgress';
import { usePhotoNavigation } from '@/components/photo/PhotoNavigationContext';
import { preloadPhoto } from '@/utils/preloadPhoto';
import { isPhotoSwipeOpen } from '@/utils/photoswipe';
import { useCallback, useEffect, useMemo, useRef } from 'react';

type CollectionPhoto = {
  shortId: string;
  url: string;
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

  // Pathname can lag behind a swipe; index from where the carousel is headed.
  const effectiveShortId = pendingShortId ?? currentPhotoShortId;
  const currentIndex = photos.findIndex((photo) => photo.shortId === effectiveShortId);
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

  const pendingRef = useRef(pendingShortId);
  const photosRef = useRef(photos);
  const currentRef = useRef(currentPhotoShortId);
  useEffect(() => {
    pendingRef.current = pendingShortId;
    photosRef.current = photos;
    currentRef.current = currentPhotoShortId;
  }, [currentPhotoShortId, pendingShortId, photos]);
  /** This hook instance pushed a photo the pathname has not reached yet. */
  const catchUpRef = useRef(false);

  // Reads the latest target, including swipes that haven't re-rendered yet.
  const getNeighbor = useCallback((direction: 'next' | 'prev') => {
    const list = photosRef.current;
    if (list.length < 2) return null;
    const effective = pendingRef.current ?? currentRef.current;
    const index = list.findIndex((photo) => photo.shortId === effective);
    if (index < 0) return null;
    const step = direction === 'next' ? 1 : -1;
    return list[(index + step + list.length) % list.length] ?? null;
  }, []);

  const navigateToPhoto = useCallback((shortId: string) => {
    if (isPhotoSwipeOpen()) return;
    const heading = pendingRef.current ?? currentRef.current;
    // Already heading there. A fast follow-up swipe must still be able to
    // move past this id — only an identical target is a no-op.
    if (shortId === heading) return;
    if (shortId === currentRef.current) {
      // Swiped back to the photo still on screen before its replacement landed.
      catchUpRef.current = false;
      pendingRef.current = null;
      setPendingShortId(null);
      router.push(getPhotoHref(shortId));
      return;
    }
    preloadPhoto(photosRef.current.find((photo) => photo.shortId === shortId)?.url);
    catchUpRef.current = true;
    pendingRef.current = shortId;
    setPendingShortId(shortId);
    router.push(getPhotoHref(shortId));
  }, [getPhotoHref, router, setPendingShortId]);

  // A second push while the first navigation is in flight can be dropped.
  // When an intermediate photo lands, continue to the one the swipe selected.
  useEffect(() => {
    if (!catchUpRef.current) return;
    const desired = pendingRef.current;
    if (!desired || desired === currentPhotoShortId) {
      catchUpRef.current = false;
      return;
    }
    router.push(getPhotoHref(desired));
  }, [currentPhotoShortId, getPhotoHref, router]);

  const goToPrevPhoto = useCallback(() => {
    const photo = getNeighbor('prev');
    if (!photo) return;
    navigateToPhoto(photo.shortId);
  }, [getNeighbor, navigateToPhoto]);

  const goToNextPhoto = useCallback(() => {
    const photo = getNeighbor('next');
    if (!photo) return;
    navigateToPhoto(photo.shortId);
  }, [getNeighbor, navigateToPhoto]);

  return {
    currentIndex,
    prevIndex,
    nextIndex,
    hasPrev,
    hasNext,
    pendingShortId,
    setPendingShortId,
    navigateToPhoto,
    getNeighbor,
    getHeadingShortId: () => pendingRef.current ?? currentRef.current,
    goToPrevPhoto,
    goToNextPhoto,
  };
}
