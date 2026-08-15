import { Suspense } from 'react';

import Container from '@/components/layout/Container';
import ColorDrawClient from './ColorDrawClient';
import ParticipantsList, { type ColorDrawParticipant } from './ParticipantsList';

type ColorDrawSectionProps = {
  challengeId: string;
  draws: ColorDrawParticipant[];
  isEnded: boolean;
};

function ColorDrawFallback({ draws }: { draws: ColorDrawParticipant[] }) {
  return (
    <div
      className="space-y-6"
    >
      <div
        className="h-10 w-64 max-w-full animate-pulse rounded-lg bg-background-medium"
      />
      <div>
        <h3
          className="mb-3 text-lg font-semibold"
        >
          Participants (
          {draws.length}
          )
        </h3>
        <ParticipantsList
          draws={draws}
        />
      </div>
    </div>
  );
}

export default function ColorDrawSection({ challengeId, draws, isEnded }: ColorDrawSectionProps) {
  return (
    <div
      className="mt-8"
    >
      <h2
        className="mb-3 text-lg font-semibold"
      >
        Draw your color
      </h2>
      <Container>
        <Suspense
          fallback={<ColorDrawFallback
            draws={draws}
          />}
        >
          <ColorDrawClient
            challengeId={challengeId}
            initialDraws={draws}
            isEnded={isEnded}
          />
        </Suspense>
      </Container>
    </div>
  );
}

