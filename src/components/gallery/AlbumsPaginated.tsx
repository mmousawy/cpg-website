'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import Button from '../shared/Button';
import EmptyState from '../shared/EmptyState';
import AlbumGrid from '../album/AlbumGrid';
import type { AlbumWithPhotos } from '@/types/albums';
import FolderSVG from 'public/icons/folder.svg';

type AlbumsPaginatedProps = {
  initialAlbums: AlbumWithPhotos[];
  perPage?: number;
  initialHasMore?: boolean;
  initialSort?: 'recent' | 'popular';
};

// Session storage key prefix
const STORAGE_KEY_PREFIX = 'albums-paginated-';

// Get storage key for current page state
function getStorageKey(pathname: string, sort: string): string {
  return `${STORAGE_KEY_PREFIX}${pathname}-${sort}`;
}

type CachedState = {
  albums: AlbumWithPhotos[];
  hasMore: boolean;
  timestamp: number;
};

// Cache expires after 5 minutes
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

function readCachedAlbums(pathname: string, sort: string): CachedState | null {
  try {
    const cached = sessionStorage.getItem(getStorageKey(pathname, sort));
    if (!cached) return null;
    const parsed: CachedState = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS && parsed.albums.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export default function AlbumsPaginated({
  initialAlbums,
  perPage = 20,
  initialHasMore,
  initialSort = 'recent',
}: AlbumsPaginatedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Always start from the server payload. Reading sessionStorage here mismatches
  // the SSR HTML (cached pages omit cover blurhashes the server already rendered).
  const [albums, setAlbums] = useState<AlbumWithPhotos[]>(initialAlbums);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>(initialSort);
  const [hasMore, setHasMore] = useState(
    initialHasMore !== undefined ? initialHasMore : initialAlbums.length >= perPage,
  );
  const [isPending, startTransition] = useTransition();

  // Restore extra pages after hydration so the first paint matches the server.
  useEffect(() => {
    const cached = readCachedAlbums(pathname, initialSort);
    if (!cached || cached.albums.length <= initialAlbums.length) return;

    const initialById = new Map(initialAlbums.map((album) => [album.id, album]));
    setAlbums(cached.albums.map((album) => initialById.get(album.id) ?? album));
    setHasMore(cached.hasMore);
  }, [pathname, initialSort, initialAlbums]);

  // Persist state to sessionStorage when albums change
  useEffect(() => {
    // Only cache if we have more than the initial albums
    if (albums.length > initialAlbums.length) {
      try {
        const key = getStorageKey(pathname, sortBy);
        const state: CachedState = {
          albums,
          hasMore,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }, [albums, hasMore, pathname, sortBy, initialAlbums.length]);

  const loadMore = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/gallery/albums?offset=${albums.length}&limit=${perPage}&sort=${sortBy}`);

        if (!res.ok) {
          throw new Error('Failed to fetch more albums');
        }

        const data = await res.json();

        setAlbums(prev => [...prev, ...data.albums]);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Error loading more albums:', error);
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

    startTransition(async () => {
      try {
        const res = await fetch(`/api/gallery/albums?offset=0&limit=${perPage}&sort=${newSort}`);

        if (!res.ok) {
          throw new Error('Failed to fetch albums');
        }

        const data = await res.json();
        setAlbums(data.albums);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Error loading albums:', error);
      }
    });
  };

  return (
    <>
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

      {albums.length === 0 && !isPending ? (
        <EmptyState
          icon={<FolderSVG
            className="size-10 inline-block"
          />}
          title="No albums found."
        />
      ) : (
        <div
          className={isPending ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}
        >
          <AlbumGrid
            albums={albums}
            className="grid gap-2 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
          />
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
              'Load more albums'
            )}
          </Button>
        </div>
      )}
    </>
  );
}
