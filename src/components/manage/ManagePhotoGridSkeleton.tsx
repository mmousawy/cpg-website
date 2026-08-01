type ManagePhotoGridSkeletonProps = {
  count?: number;
  className?: string;
};

function SkeletonTile({ delayMs }: { delayMs: number }) {
  return (
    <div
      className="aspect-square animate-pulse bg-background-light"
      style={{
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/**
 * Skeleton for the manage photo grid (SelectableGrid layout).
 */
export default function ManagePhotoGridSkeleton({
  count = 15,
  className = 'flex-1 overflow-hidden p-3 md:p-6',
}: ManagePhotoGridSkeletonProps) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Loading photos"
    >
      <div
        className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(144px,1fr))] content-start"
      >
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonTile
            key={index}
            delayMs={index * 50}
          />
        ))}
      </div>
    </div>
  );
}
