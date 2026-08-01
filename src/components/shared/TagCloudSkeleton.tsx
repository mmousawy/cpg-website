const TAG_WIDTHS = [80, 100, 68, 112, 76, 96, 88, 104, 72, 92, 84, 108, 76, 96, 80, 112, 68, 100, 88, 72];

/** lg → xs, sized to fill ~2 rows in the gallery header */
const GALLERY_TAG_SKELETON = [
  { width: 132, height: 28 },
  { width: 120, height: 28 },
  { width: 108, height: 28 },
  { width: 96, height: 28 },
  { width: 88, height: 28 },
  { width: 80, height: 28 },
  { width: 72, height: 26 },
  { width: 68, height: 26 },
  { width: 64, height: 26 },
  { width: 60, height: 26 },
  { width: 60, height: 26 },
  { width: 60, height: 26 },
  { width: 60, height: 26 },
  { width: 60, height: 26 },
  { width: 60, height: 26 },
  { width: 60, height: 26 },
] as const;

type TagCloudSkeletonProps = {
  count?: number;
  /** Gallery browse-by-tag: max 2 rows, tags shrink large → small */
  variant?: 'default' | 'gallery';
};

/**
 * Placeholder for tag clouds (gallery tags, photo style tags, etc.)
 */
export default function TagCloudSkeleton({
  count = TAG_WIDTHS.length,
  variant = 'default',
}: TagCloudSkeletonProps) {
  const tags = variant === 'gallery'
    ? GALLERY_TAG_SKELETON
    : TAG_WIDTHS.slice(0, count).map((width, index) => ({
      width,
      height: [26, 28, 30, 32][index % 4],
    }));

  return (
    <div
      className={
        variant === 'gallery'
          ? 'flex max-h-[4.5rem] flex-wrap items-center gap-2 overflow-hidden'
          : 'flex flex-wrap items-center gap-2'
      }
      aria-busy="true"
      aria-label="Loading tags"
    >
      {tags.map((tag, index) => (
        <div
          key={index}
          className="animate-pulse rounded border border-border-color bg-background-medium"
          style={{
            width: tag.width,
            height: tag.height,
            animationDelay: `${index * 50}ms`,
          }}
        />
      ))}
    </div>
  );
}
