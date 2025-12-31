import Container from "@/components/layout/Container";

import { createClient } from '@/utils/supabase/server';

import CancelBlock from "./CancelBlock";

import ErrorSVG from 'public/icons/error.svg';

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
    <section
      className="flex justify-center bg-background px-6 pb-10 pt-8 text-foreground sm:p-12 sm:pb-14"
    >
      <div className="w-full max-w-screen-md">
        <h2 className="mb-4 text-lg font-bold leading-tight opacity-70">Cancel your RSVP</h2>
        <Container>
          {(!event || !rsvp || !rsvp.email) && (
            <div className='flex gap-2 rounded-md bg-[#c5012c20] p-2 text-[15px] font-semibold leading-6 text-error-red'>
              <ErrorSVG className="shrink-0 fill-error-red" />
              <p>
                Something went wrong with retrieving your RSVP details. Please contact us for assistance.
              </p>
            </div>
          )}
          { event && rsvp?.email && (
            <CancelBlock
              event={event}
              rsvp={rsvp}
            />
          )}
        </Container>
      </div>
    </section>
  );
}
