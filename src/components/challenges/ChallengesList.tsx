import EmptyState from '@/components/shared/EmptyState';
import type { ChallengeWithStats } from '@/types/challenges';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import ChallengeCard from './ChallengeCard';

/** 1 col through 2xs (375px); 2 cols from 376px until sm auto-fill. */
export const challengesListGridClassName =
  'grid grid-cols-1 min-[415px]:grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]';

type ChallengesListProps = {
  challenges: ChallengeWithStats[];
  emptyMessage?: string;
  serverNow: number;
  isPast?: boolean;
  prefetchLinks?: boolean;
  className?: string;
  coverImageSizes?: string;
};

export default function ChallengesList({
  challenges,
  emptyMessage = 'No challenges found.',
  serverNow,
  isPast = false,
  prefetchLinks,
  className = challengesListGridClassName,
  coverImageSizes,
}: ChallengesListProps) {
  if (challenges.length === 0) {
    return (
      <EmptyState
        icon={<AwardStarMiniSVG
          className="size-10 fill-foreground/20 inline-block"
        />}
        title={emptyMessage}
      />
    );
  }

  return (
    <div
      className={className}
    >
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          serverNow={serverNow}
          isPast={isPast}
          prefetch={prefetchLinks}
          coverImageSizes={coverImageSizes}
        />
      ))}
    </div>
  );
}
