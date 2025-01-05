import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/utils/supabase/server";

import config from "@/app/api/config";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { uuid } = await request.json();

  if (!uuid) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  // Get the RSVP
  const { data: rsvp } = await supabase.from('events_rsvps')
    .select()
    .eq('uuid', uuid)
    .single();

  // Get the event and check if it exists
  const { data: event } = await supabase.from('events')
    .select()
    .eq('id', rsvp?.event_id || '')
    .single();

  if (!rsvp || !event || !rsvp.email) {
    return NextResponse.json({ message: "RSVP or event not found" }, { status: 404 });
  }

  // Cancel the RSVP into the database
  await supabase.from('events_rsvps')
    .update({
      canceled_at: new Date().toISOString()
    })
    .eq('uuid', uuid);

  // Send the confirmation email
  resend.emails.send({
    from: config.email.from,
    to: rsvp.email,
    replyTo: config.email.replyTo,
    subject: `Cancelled RSVP: ${event.title}`,
    html: `
      <p>You've successfully cancelled your RSVP. We'll miss you!</p>
      <p>If you change your mind, you can always sign up again.</p>
    `
  });

  return NextResponse.json({}, { status: 200 });
}
