import type { ChallengeWithStats } from '@/types/challenges';
import AwardStarMiniSVG from 'public/icons/award-star-mini.svg';
import ChallengeCard from './ChallengeCard';

type ChallengesListProps = {
  challenges: ChallengeWithStats[];
  emptyMessage?: string;
  serverNow: number;
  isPast?: boolean;
};

export default function ChallengesList({
  challenges,
  emptyMessage = 'No challenges found.',
  serverNow,
  isPast = false,
}: ChallengesListProps) {
  if (challenges.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-2xl border border-dashed border-border-color bg-background-light/50"
      >
        <AwardStarMiniSVG
          className="h-12 w-12 fill-foreground/20 mx-auto mb-3"
        />
        <p
          className="text-foreground/70"
        >
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]"
    >
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          serverNow={serverNow}
          isPast={isPast}
        />
      ))}
    </div>
  );
}
