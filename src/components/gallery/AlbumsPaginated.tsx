'use client';

import { useState, useTransition } from 'react';
import Button from '../shared/Button';
import AlbumGrid from '../album/AlbumGrid';
import type { AlbumWithPhotos } from '@/types/albums';

type AlbumsPaginatedProps = {
  initialAlbums: AlbumWithPhotos[];
  perPage?: number;
  initialHasMore?: boolean;
};

export default function AlbumsPaginated({
  initialAlbums,
  perPage = 20,
  initialHasMore,
}: AlbumsPaginatedProps) {
  const [albums, setAlbums] = useState<AlbumWithPhotos[]>(initialAlbums);
  // If initialHasMore is provided, use it; otherwise check if we got a full page
  const [hasMore, setHasMore] = useState(
    initialHasMore !== undefined ? initialHasMore : initialAlbums.length >= perPage
  );
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/gallery/albums?offset=${albums.length}&limit=${perPage}`);

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

  if (albums.length === 0) {
    return (
      <div className="rounded-lg border border-border-color bg-background-light p-12 text-center">
        <p className="text-lg opacity-70">
          No albums yet. Be the first to create one!
        </p>
      </div>
    );
  }

  return (
    <>
      <AlbumGrid
        albums={albums}
        className="grid gap-2 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
      />

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={loadMore}
            variant="secondary"
            size="md"
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
