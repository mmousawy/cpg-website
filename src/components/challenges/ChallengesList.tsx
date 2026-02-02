import type { ChallengeWithStats } from '@/types/challenges';
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
      <p
        className="py-8 text-center text-foreground/50"
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
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
