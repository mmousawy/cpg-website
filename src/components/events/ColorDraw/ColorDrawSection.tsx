import Container from '@/components/layout/Container';
import ColorDrawClient from './ColorDrawClient';
import type { ColorDrawParticipant } from './ParticipantsList';

type ColorDrawSectionProps = {
  eventId: number;
  draws: ColorDrawParticipant[];
};

export default function ColorDrawSection({ eventId, draws }: ColorDrawSectionProps) {
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
          eventId={eventId}
          initialDraws={draws}
        />
      </Container>
    </div>
  );
}
