'use client';

import { useState, useTransition } from 'react';
import Button from '../shared/Button';
import JustifiedPhotoGrid from '../photo/JustifiedPhotoGrid';
import type { StreamPhoto } from '@/lib/data/gallery';

type PhotosPaginatedProps = {
  initialPhotos: StreamPhoto[];
  apiEndpoint: string;
  perPage?: number;
  initialHasMore?: boolean;
};

export default function PhotosPaginated({
  initialPhotos,
  apiEndpoint,
  perPage = 20,
  initialHasMore,
}: PhotosPaginatedProps) {
  const [photos, setPhotos] = useState<StreamPhoto[]>(initialPhotos);
  // If initialHasMore is provided, use it; otherwise check if we got a full page
  const [hasMore, setHasMore] = useState(
    initialHasMore !== undefined ? initialHasMore : initialPhotos.length >= perPage,
  );
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`${apiEndpoint}?offset=${photos.length}&limit=${perPage}`);

        if (!res.ok) {
          throw new Error('Failed to fetch more photos');
        }

        const data = await res.json();

        setPhotos(prev => [...prev, ...data.photos]);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Error loading more photos:', error);
      }
    });
  };

  if (photos.length === 0) {
    return (
      <div
        className="rounded-lg border border-border-color bg-background-light p-12 text-center"
      >
        <p
          className="text-lg opacity-70"
        >
          No photos yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <JustifiedPhotoGrid
        photos={photos}
        showAttribution
      />

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
