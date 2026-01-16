import Container from "@/components/layout/Container";
import PageContainer from "@/components/layout/PageContainer";
import { createClient } from '@/utils/supabase/server';
import ConfirmBlock from "./ConfirmBlock";
import ErrorMessage from '@/components/shared/ErrorMessage';
import { createNoIndexMetadata } from '@/utils/metadata';
import { unstable_noStore } from 'next/cache';

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
  unstable_noStore();

  const supabase = await createClient();
  const { uuid } = await params;

  // Single query with JOIN instead of 2 sequential queries
  const { data: rsvp } = await supabase.from("events_rsvps")
    .select(`
      *,
      events (*)
    `)
    .eq("uuid", uuid)
    .single();

  const event = rsvp?.events || null;

  return (
    <PageContainer>
      <h2 className="mb-4 text-lg font-bold leading-tight opacity-70">Confirm your sign up</h2>
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
