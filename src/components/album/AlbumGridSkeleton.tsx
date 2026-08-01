type AlbumGridSkeletonProps = {
  count?: number;
  className?: string;
};

function AlbumCardSkeleton() {
  return (
    <div
      className="overflow-hidden border border-border-color bg-background-light"
    >
      <div
        className="aspect-4/3 animate-pulse bg-background-medium"
      />
      <div
        className="p-2.5"
      >
        <div
          className="h-4 w-3/4 animate-pulse rounded bg-background-medium"
        />
        <div
          className="mt-2 flex items-center justify-between"
        >
          <div
            className="flex items-center gap-1.5"
          >
            <div
              className="size-5 shrink-0 animate-pulse rounded-full bg-background-medium"
            />
            <div
              className="h-3 w-16 animate-pulse rounded bg-background-medium"
            />
          </div>
          <div
            className="h-3 w-10 animate-pulse rounded bg-background-medium"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder for album grids while route or dynamic chunk loads.
 */
export default function AlbumGridSkeleton({
  count = 6,
  className = 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-6',
}: AlbumGridSkeletonProps) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Loading albums"
    >
      {Array.from({ length: count }).map((_, index) => (
        <AlbumCardSkeleton
          key={index}
        />
      ))}
    </div>
  );
}
