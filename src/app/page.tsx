import { createClient } from '@/utils/supabase/server';
import { Database } from '../../database.types';

import About from "./components/about";
import Events from "./components/events";
import Header from "./components/header";

export type ExtendedEvent = Database['public']['Tables']['events']['Row'] & {
  attendees?: Database['public']['Tables']['events_rsvps']['Row'][];
};

export default async function Home() {
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
    <div className="bg-background font-[family-name:var(--font-inter)]">
      <main>
        <Header />
        <Events events={events}/>
        <About />
      </main>
    </div>
  );
}

export const revalidate = 3600;
