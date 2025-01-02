import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

const attendees = [
  {
    email: 'murtada.al.mousawy@gmail.com',
    name: 'Murtada al Mousawy',
  },
  {
    email: 'kaleigh.rawr@gmail.com',
    name: 'Kaleigh Hunter',
  },
];

export default async function Events() {
  const supabase = await createClient();
  const { data: events } = await supabase.from("events").select();
  const emailHash = crypto.createHash('md5').update('murtada.al.mousawy@gmail.com').digest("hex");
  const emailHash2 = crypto.createHash('md5').update('kaleigh.rawr@gmail.com').digest("hex");

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
                <p className='mb-2'>{event.time}</p>
                <p className='mb-2'>{event.location.replace(/\r\n/gm, ' • ')}</p>
                <p className='whitespace-pre-line'>{event.description}</p>
                <hr />
                <div className='flex items-center gap-2'>
                  <div className='flex flex-row-reverse'>
                    {/* Avatar list of attendees */}
                    {attendees.reverse().map((attendee, attendeeIndex) => (
                      <img
                        key={attendee.email}
                        className="z-10 -mr-2 size-8 rounded-full shadow"
                        src={`https://gravatar.com/avatar/${crypto.createHash('md5').update(attendee.email).digest("hex")}?s=64`} alt="Gravatar"
                      />
                    ))}
                  </div>
                  {event.rsvps_count || 0} attendees
                </div>
              </div>
              <img
                className='h-full w-60 rounded-md object-cover'
                src={event.cover_image}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
