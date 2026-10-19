'use client';

import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useManageScrollContainer } from '@/context/ManageScrollContext';
import { useEffect, useRef } from 'react';

const LOAD_MORE_ROOT_MARGIN = '0px 0px 200px 0px';

type ManageLoadMoreSentinelProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  /** Changing this reconnects the observer (e.g. photo filter). */
  resetKey?: string;
  /**
   * Number of items currently rendered. When this shrinks (a delete) and the
   * sentinel is already in view, load the next page — the user can no longer
   * scroll far enough to trip the observer.
   */
  itemCount?: number;
};

function isSentinelInLoadZone(root: HTMLElement, sentinel: HTMLElement): boolean {
  const rootRect = root.getBoundingClientRect();
  const sentinelRect = sentinel.getBoundingClientRect();
  const marginBottom = 200;
  return (
    sentinelRect.top <= rootRect.bottom + marginBottom &&
    sentinelRect.bottom >= rootRect.top
  );
}

/**
 * Infinite-scroll sentinel for manage pages. Must be rendered inside ManageLayout
 * so useManageScrollContainer() resolves to the content scroll area.
 */
export default function ManageLoadMoreSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  resetKey,
  itemCount,
}: ManageLoadMoreSentinelProps) {
  const scrollContainerRef = useManageScrollContainer();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(isFetchingNextPage);
  const hasNextPageRef = useRef(hasNextPage);
  const onLoadMoreRef = useRef(onLoadMore);
  const wasIntersectingRef = useRef(false);
  const prevItemCountRef = useRef(itemCount);
  /** Keep fetching after a shrink until the list is tall enough to scroll again. */
  const fillingAfterShrinkRef = useRef(false);
  /** itemCount we already requested a refill for, so a replayed effect does not double-fetch. */
  const filledForCountRef = useRef<number | null>(null);

  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  useEffect(() => {
    hasNextPageRef.current = hasNextPage;
  }, [hasNextPage]);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (itemCount == null) return;
    const previous = prevItemCountRef.current;
    prevItemCountRef.current = itemCount;
    if (previous != null && itemCount < previous) {
      fillingAfterShrinkRef.current = true;
    }
  }, [itemCount]);

  // A delete can pull the sentinel into view, or make the list shorter than the
  // scroller, so the usual "user scrolled onto the sentinel" edge never fires.
  useEffect(() => {
    if (!fillingAfterShrinkRef.current) return;
    if (!hasNextPage) {
      fillingAfterShrinkRef.current = false;
      return;
    }
    if (isFetchingNextPage || isFetchingRef.current) return;

    const sentinel = sentinelRef.current;
    const root = scrollContainerRef?.current;
    if (!sentinel || !root) return;

    const needsMore = isSentinelInLoadZone(root, sentinel)
      || root.scrollHeight <= root.clientHeight + 1;
    if (!needsMore) {
      fillingAfterShrinkRef.current = false;
      return;
    }

    if (itemCount != null && filledForCountRef.current === itemCount) return;
    filledForCountRef.current = itemCount ?? null;
    isFetchingRef.current = true;
    onLoadMoreRef.current();
  }, [itemCount, hasNextPage, isFetchingNextPage, scrollContainerRef]);

  // After a batch lands, treat an in-view sentinel as already seen so we don't chain-load.
  useEffect(() => {
    if (isFetchingNextPage) return;

    const sentinel = sentinelRef.current;
    const root = scrollContainerRef?.current;
    if (!sentinel || !root) return;

    wasIntersectingRef.current = isSentinelInLoadZone(root, sentinel);
  }, [isFetchingNextPage, scrollContainerRef]);

  useEffect(() => {
    if (!hasNextPage) return;

    const sentinel = sentinelRef.current;
    const root = scrollContainerRef?.current;
    if (!sentinel || !root) return;

    wasIntersectingRef.current = isSentinelInLoadZone(root, sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries[0]?.isIntersecting ?? false;

        // Require the user to scroll before loading more (avoids 2nd batch on mount).
        const hasScrolled = root.scrollTop > 0;

        if (
          isIntersecting &&
          !wasIntersectingRef.current &&
          hasScrolled &&
          hasNextPageRef.current &&
          !isFetchingRef.current
        ) {
          onLoadMoreRef.current();
        }

        wasIntersectingRef.current = isIntersecting;
      },
      { root, rootMargin: LOAD_MORE_ROOT_MARGIN },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, scrollContainerRef, resetKey]);

  if (!hasNextPage) return null;

  return (
    <div
      ref={sentinelRef}
      className="flex justify-center py-4"
    >
      {isFetchingNextPage && (
        <LoadingSpinner
          size="sm"
        />
      )}
    </div>
  );
}
