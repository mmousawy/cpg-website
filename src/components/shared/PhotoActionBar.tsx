import DetailLikesSection from '@/components/shared/DetailLikesSection';
import ViewCount from '@/components/shared/ViewCount';
import clsx from 'clsx';

interface PhotoActionBarProps {
  /** Entity type for likes */
  entityType: 'photo' | 'album';
  /** Entity ID */
  entityId: string;
  /** Initial likes count from server */
  initialLikesCount?: number;
  /** View count */
  viewCount?: number;
  /** Additional className */
  className?: string;
}

/**
 * Horizontal action bar for photo/album detail pages.
 * Displays like button and view count in a row, similar to Instagram/DeviantArt.
 */
export default function PhotoActionBar({
  entityType,
  entityId,
  initialLikesCount = 0,
  viewCount = 0,
  className,
}: PhotoActionBarProps) {
  return (
    <div
      className={clsx('flex items-center gap-4', className)}
    >
      <DetailLikesSection
        entityType={entityType}
        entityId={entityId}
        initialCount={initialLikesCount}
      />
      {viewCount > 0 && (
        <ViewCount
          count={viewCount}
          compact
        />
      )}
    </div>
  );
}
