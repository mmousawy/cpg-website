import type { ChallengeWithStats } from '@/types/challenges';
import EmptyState from '@/components/shared/EmptyState';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import ChallengeCard from './ChallengeCard';
type ChallengesListProps = {
  challenges: ChallengeWithStats[];
  emptyMessage?: string;
  serverNow: number;
  isPast?: boolean;
  prefetchLinks?: boolean;
};

export default function ChallengesList({
  challenges,
  emptyMessage = 'No challenges found.',
  serverNow,
  isPast = false,
  prefetchLinks,
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
      className="grid gap-3 sm:gap-5 grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]"
    >
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          serverNow={serverNow}
          isPast={isPast}
          prefetch={prefetchLinks}
        />
      ))}
    </div>
  );
}
