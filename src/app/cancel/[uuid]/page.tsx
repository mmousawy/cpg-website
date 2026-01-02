import Container from "@/components/layout/Container";
import PageContainer from "@/components/layout/PageContainer";
import { createClient } from '@/utils/supabase/server';
import CancelBlock from "./CancelBlock";
import ErrorMessage from '@/components/shared/ErrorMessage';

export default async function Cancel({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const supabase = await createClient();
  const { uuid } = await params;

  const { data: rsvp } = await supabase.from("events_rsvps")
    .select()
    .eq("uuid", uuid)
    .single();

  const { data: event } = await supabase.from("events")
    .select()
    .eq("id", rsvp?.event_id || -1)
    .single();

  return (
    <PageContainer>
      <h2 className="mb-4 text-lg font-bold leading-tight opacity-70">Cancel your RSVP</h2>
      <Container>
        {(!event || !rsvp || !rsvp.email) && (
          <ErrorMessage>
            Something went wrong with retrieving your RSVP details. Please contact us for assistance.
          </ErrorMessage>
        )}
        { event && rsvp?.email && (
          <CancelBlock
            event={event}
            rsvp={rsvp}
          />
        )}
      </Container>
    </PageContainer>
  );
}
