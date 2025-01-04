import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { event_id, name, email } = await request.json();

  if (!event_id || !name || !email) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const result = await supabase.from('events_rsvps').insert({
    event_id: event_id,
    name: name,
    email: email,
  });

  if (result.error) {
    if (result.error.message.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json({ message: "You have already signed up for this event" }, { status: 400 });
    }

    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  return NextResponse.json({}, { status: 200 });
}
