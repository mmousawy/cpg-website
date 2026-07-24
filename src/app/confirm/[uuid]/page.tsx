import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import { Database } from '@/database.types';
import { CPGEvent } from '@/types/events';
import { createClient } from '@/utils/supabase/server';
import ConfirmBlock from './ConfirmBlock';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { createNoIndexMetadata } from '@/utils/metadata';
import { connection } from 'next/server';

// Provide sample params for build-time validation (required with cacheComponents)
export async function generateStaticParams() {
  return [{ uuid: 'sample-uuid' }];
}

export const metadata = createNoIndexMetadata({
  title: 'Confirm sign up',
  description: 'Confirm your event sign up',
});

export default async function Confirm({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  // Opt out of static generation - this route requires cookies/auth
  await connection();

  const supabase = await createClient();
  const { uuid } = await params;

  const { data: rsvpPayload } = await supabase.rpc('get_rsvp_by_uuid', { p_uuid: uuid });
  const payload = rsvpPayload as { rsvp?: Database['public']['Tables']['events_rsvps']['Row']; event?: CPGEvent } | null;
  const rsvp = payload?.rsvp ?? null;
  const event = payload?.event ?? null;

  return (
    <PageContainer>
      <h2
        className="mb-4 text-lg font-bold leading-tight opacity-70"
      >
        Confirm your sign up
      </h2>
      <Container>
        {(!event || !rsvp || !rsvp.email) && (
          <ErrorMessage>
            Something went wrong with retrieving your RSVP details. Please contact us for assistance.
          </ErrorMessage>
        )}
        { event && rsvp?.email && (
          <ConfirmBlock
            event={event}
            rsvp={rsvp}
          />
        )}
      </Container>
    </PageContainer>
  );
}
