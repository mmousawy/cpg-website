import DetailLikesSection from '@/components/shared/DetailLikesSection';
import ShareButton from '@/components/shared/ShareButton';
import ViewCount from '@/components/shared/ViewCount';
import clsx from 'clsx';

export type ShareData = {
  url: string;
  title: string;
  image?: string | null;
};

interface PhotoActionBarProps {
  /** Entity type for likes */
  entityType: 'photo' | 'album';
  /** Entity ID */
  entityId: string;
  /** Initial likes count from server */
  initialLikesCount?: number;
  /** View count */
  viewCount?: number;
  /** Share data for the share button */
  share?: ShareData;
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
  share,
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
      {share && (
        <ShareButton
          url={share.url}
          title={share.title}
          image={share.image}
        />
      )}
      {viewCount > 0 && (
        <ViewCount
          count={viewCount}
          compact
        />
      )}
    </div>
  );
}
