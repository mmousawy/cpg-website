import HeartFilledIcon from 'public/icons/heart-filled.svg';

interface CardLikesProps {
  /** Like count to display */
  likesCount: number;
  /** Show compact version (just icon + count) */
  compact?: boolean;
}

/**
 * Pure display component for showing like count on cards.
 * No data fetching - parent components must provide the count.
 */
export default function CardLikes({ likesCount, compact = true }: CardLikesProps) {
  // Don't show if no likes
  if (likesCount === 0) {
    return null;
  }

  if (compact) {
    return (
      <div
        className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-1 text-xs text-white pointer-events-none"
        title={`${likesCount} ${likesCount === 1 ? 'like' : 'likes'}`}
      >
        <HeartFilledIcon className="size-3" />
        <span>{likesCount}</span>
      </div>
    );
  }

  return null;
}
