'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition, useEffect, useCallback } from 'react';
import Button from '../shared/Button';
import JustifiedPhotoGrid from '../photo/JustifiedPhotoGrid';
import type { StreamPhoto } from '@/lib/data/gallery';

type PhotoBatch = {
  id: string;
  photos: StreamPhoto[];
};

type PhotosPaginatedProps = {
  initialPhotos: StreamPhoto[];
  perPage?: number;
  initialHasMore?: boolean;
  initialSort?: 'recent' | 'popular';
  apiEndpoint?: string;
  showSortToggle?: boolean;
};

// Session storage key prefix
const STORAGE_KEY_PREFIX = 'photos-paginated-';

// Get storage key for current page state
function getStorageKey(pathname: string, sort: string): string {
  return `${STORAGE_KEY_PREFIX}${pathname}-${sort}`;
}

type CachedState = {
  batches: PhotoBatch[];
  hasMore: boolean;
  timestamp: number;
};

// Cache expires after 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

export default function PhotosPaginated({
  initialPhotos,
  perPage = 20,
  initialHasMore,
  initialSort = 'recent',
  apiEndpoint = '/api/gallery/photos',
  showSortToggle = true,
}: PhotosPaginatedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from sessionStorage if available
  const getInitialState = useCallback((): { batches: PhotoBatch[]; hasMore: boolean } => {
    if (typeof window === 'undefined') {
      return {
        batches: [{ id: 'initial', photos: initialPhotos }],
        hasMore: initialHasMore !== undefined ? initialHasMore : initialPhotos.length >= perPage,
      };
    }

    try {
      const key = getStorageKey(pathname, initialSort);
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const parsed: CachedState = JSON.parse(cached);
        // Check if cache is still valid
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS && parsed.batches.length > 0) {
          return { batches: parsed.batches, hasMore: parsed.hasMore };
        }
      }
    } catch {
      // Ignore storage errors
    }

    return {
      batches: [{ id: 'initial', photos: initialPhotos }],
      hasMore: initialHasMore !== undefined ? initialHasMore : initialPhotos.length >= perPage,
    };
  }, [pathname, initialSort, initialPhotos, initialHasMore, perPage]);

  // Track batches of photos - each batch has its own stable layout
  const [batches, setBatches] = useState<PhotoBatch[]>(() => getInitialState().batches);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>(initialSort);
  const [hasMore, setHasMore] = useState(() => getInitialState().hasMore);
  const [isPending, startTransition] = useTransition();
  const [isSorting, setIsSorting] = useState(false);

  // Restore state from sessionStorage on mount (client-side only)
  useEffect(() => {
    const { batches: cachedBatches, hasMore: cachedHasMore } = getInitialState();
    // Only restore if we have more than initial batch
    if (cachedBatches.length > 1) {
      setBatches(cachedBatches);
      setHasMore(cachedHasMore);
    }
  }, [getInitialState]);

  // Persist state to sessionStorage when batches change
  useEffect(() => {
    // Only cache if we have more than the initial batch
    if (batches.length > 1) {
      try {
        const key = getStorageKey(pathname, sortBy);
        const state: CachedState = {
          batches,
          hasMore,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }, [batches, hasMore, pathname, sortBy]);

  // Calculate total photo count for offset
  const totalPhotoCount = batches.reduce((sum, batch) => sum + batch.photos.length, 0);

  const loadMore = () => {
    startTransition(async () => {
      try {
        const sortParam = showSortToggle ? `&sort=${sortBy}` : '';
        const res = await fetch(`${apiEndpoint}?offset=${totalPhotoCount}&limit=${perPage}${sortParam}`);

        if (!res.ok) {
          throw new Error('Failed to fetch more photos');
        }

        const data = await res.json();

        // Add new batch with unique ID
        setBatches(prev => [
          ...prev,
          { id: `batch-${prev.length}`, photos: data.photos },
        ]);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Error loading more photos:', error);
      }
    });
  };

  const handleSortChange = (newSort: 'recent' | 'popular') => {
    if (newSort === sortBy) return;

    // Clear cached state for the old sort
    try {
      const oldKey = getStorageKey(pathname, sortBy);
      sessionStorage.removeItem(oldKey);
    } catch {
      // Ignore storage errors
    }

    setSortBy(newSort);

    // Update URL query parameter
    const params = new URLSearchParams(searchParams.toString());
    if (newSort === 'recent') {
      params.delete('sort');
    } else {
      params.set('sort', newSort);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });

    setIsSorting(true);
    startTransition(async () => {
      try {
        const res = await fetch(`${apiEndpoint}?offset=0&limit=${perPage}&sort=${newSort}`);

        if (!res.ok) {
          throw new Error('Failed to fetch photos');
        }

        const data = await res.json();
        // Reset to single batch when sort changes
        setBatches([{ id: `${newSort}-initial`, photos: data.photos }]);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Error loading photos:', error);
      } finally {
        setIsSorting(false);
      }
    });
  };

  return (
    <>
      {showSortToggle && (
        <div
          className="flex items-center gap-2 mb-6"
        >
          <Button
            variant={sortBy === 'recent' ? 'primary' : 'secondary'}
            onClick={() => handleSortChange('recent')}
            size="sm"
            disabled={isPending}
          >
            Recent
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'primary' : 'secondary'}
            onClick={() => handleSortChange('popular')}
            size="sm"
            disabled={isPending}
          >
            Popular
          </Button>
          {isPending && (
            <svg
              className="animate-spin h-4 w-4 text-foreground/50"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </div>
      )}

      {totalPhotoCount === 0 && !isPending ? (
        <div
          className="rounded-lg border border-border-color bg-background-light p-12 text-center"
        >
          <p
            className="text-lg opacity-70"
          >
            No photos found.
          </p>
        </div>
      ) : (
        <div
          className={isSorting ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}
        >
          {/* Render each batch as its own grid - each has stable layout */}
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="mb-1"
            >
              <JustifiedPhotoGrid
                photos={batch.photos}
                showAttribution
              />
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div
          className="flex justify-center pt-6"
        >
          <Button
            onClick={loadMore}
            variant="secondary"
            size="md"
            disabled={isPending}
          >
            {isPending ? (
              <span
                className="flex items-center gap-2"
              >
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : (
              'Load more photos'
            )}
          </Button>
        </div>
      )}
    </>
  );
}
