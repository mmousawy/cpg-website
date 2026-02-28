import Container from '@/components/layout/Container';
import ColorDrawClient from './ColorDrawClient';
import type { ColorDrawParticipant } from './ParticipantsList';

type ColorDrawSectionProps = {
  challengeId: string;
  draws: ColorDrawParticipant[];
  isEnded: boolean;
};

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
        <ColorDrawClient
          challengeId={challengeId}
          initialDraws={draws}
          isEnded={isEnded}
        />
      </Container>
    </div>
  );
}
