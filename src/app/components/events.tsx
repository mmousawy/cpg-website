import { createClient } from '@/utils/supabase/server';
import Image from 'next/image';
import crypto from 'crypto';
import { Database } from '../../../database.types';

type ExtendedEvent = Database['public']['Tables']['events']['Row'] & {
  attendees?: Database['public']['Tables']['events_rsvps']['Row'][];
};

export default async function Events() {
  const supabase = await createClient();

  const response = await supabase.from("events").select();
  const events = response.data as ExtendedEvent[];

  const promises = events.map(async (event) => {
    // Get the attendees for each event
    const { data: attendees } = await supabase.from("events_rsvps").select().eq("event_id", event.id);

    event.attendees = attendees!;
  });

  await Promise.all(promises!);

  return (
    <section
      className="flex justify-center bg-background p-6 text-foreground sm:p-12"
    >
      <div className="w-full max-w-screen-md">
        <h2 className="mb-4 font-bold leading-tight max-sm:text-lg sm:text-xl">Upcoming events</h2>
        <div className="grid gap-4">
          {events && events.map((event) => (
            <div key={event.id} className="flex gap-4 rounded-lg border border-primary p-4 shadow">
              <div>
                <h3 className="text-2xl font-bold">{event.title}</h3>
                <hr />
                <p className='mb-2'>{event.date}</p>
                <p className='mb-2'>{event.location?.replace(/\r\n/gm, ' • ')}</p>
                <p className='whitespace-pre-line'>{event.description}</p>
                <hr />
                <div className='flex items-center gap-2'>
                  <div className='flex flex-row-reverse'>
                    {/* Avatar list of attendees */}
                    {event.attendees?.reverse().map((attendee) => (
                      <Image
                        key={attendee.email}
                        width={32}
                        height={32}
                        className="z-10 -mr-2 size-8 rounded-full shadow"
                        src={`https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email || '').digest("hex")}?s=64`} alt="Gravatar"
                      />
                    ))}
                  </div>
                  {event.attendees?.length} attendee{event.attendees?.length === 1 ? '' : 's'}
                </div>
              </div>
              <Image
                width={640}
                height={640}
                alt='Event cover image'
                className='h-full w-60 rounded-md object-cover'
                src={event.cover_image!}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
