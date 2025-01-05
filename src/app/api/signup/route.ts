import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/utils/supabase/server";

import config from "@/app/api/config";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();

  const { event_id, name, email } = await request.json();

  if (!event_id || !name || !email) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  // Get the event and check if it exists
  const { data: event } = await supabase.from('events').select().eq('id', event_id).single();

  if (!event) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  // Check if the user has already signed up for the event
  // RSVP cannot be canceled
  // RSVP must be confirmed or not confirmed
  const { data: existingRSVP } = await supabase.from('events_rsvps').select().eq('event_id', event_id).eq('email', email)
    .is("canceled_at", null)
    .or("confirmed_at.is.null, confirmed_at.not.is.null")
    .single();

  if (existingRSVP) {
    return NextResponse.json({ message: "You have already signed up for this event" }, { status: 400 });
  }

  // Insert the RSVP into the database
  const result = await supabase.from('events_rsvps')
    .insert({
      event_id: event_id,
      name: name,
      email: email,
    })
    .select()
    .single();

  if (result.error) {
    if (result.error.message.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json({ message: "You have already signed up for this event" }, { status: 400 });
    }

    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  // Prepare the confirmation email link
  const confirmLink = `${process.env.NEXT_PUBLIC_SITE_URL}/confirm?uuid=${result.data.uuid}`;

  // Send the confirmation email
  resend.emails.send({
    from: config.email.from,
    to: email,
    replyTo: config.email.replyTo,
    subject: `Sign up for: ${event.title}`,
    html: `
      <p>Confirm that you want to sign up for the event ${event.title}.</p>
      <p><a href="${confirmLink}">Confirm sign up</a></p>
    `
  });

  return NextResponse.json({}, { status: 200 });
}
