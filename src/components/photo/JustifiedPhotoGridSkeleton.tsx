type JustifiedPhotoGridSkeletonProps = {
  rows?: number;
  header?: React.ReactNode;
  className?: string;
};

const ROW_PATTERNS: number[][] = [
  [1.2, 0.8, 1],
  [1.5, 1],
  [0.9, 1.1, 1],
  [1.3, 1.3],
];

function SkeletonCell({ flexGrow }: { flexGrow: number }) {
  return (
    <div
      className="h-[140px] animate-pulse rounded-sm bg-background-medium sm:h-[180px] md:h-[220px]"
      style={{ flexGrow, flexBasis: 0 }}
    />
  );
}

/**
 * Placeholder for justified photo grids while route or dynamic chunk loads.
 */
export default function JustifiedPhotoGridSkeleton({
  rows = 3,
  header,
  className = '',
}: JustifiedPhotoGridSkeletonProps) {
  return (
    <div
      className={`@container w-full ${className}`}
      aria-busy="true"
      aria-label="Loading photos"
    >
      {header}
      <div
        className="space-y-1 sm:space-y-2"
      >
        {Array.from({ length: rows }).map((_, rowIndex) => {
          const pattern = ROW_PATTERNS[rowIndex % ROW_PATTERNS.length];

          return (
            <div
              key={rowIndex}
              className="flex gap-1 sm:gap-2"
            >
              {pattern.map((flexGrow, cellIndex) => (
                <SkeletonCell
                  key={cellIndex}
                  flexGrow={flexGrow}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
