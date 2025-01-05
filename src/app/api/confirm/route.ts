import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/utils/supabase/server";

import config from "@/app/api/config";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
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

  // Confirm the RSVP into the database
  const result = await supabase.from('events_rsvps')
    .update({
      confirmed_at: new Date().toISOString()
    })
    .eq('uuid', uuid);

  if (result.error) {
    console.error(result.error);

    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  // Prepare the cancellation email link
  const cancellationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/cancel?uuid=${uuid}`;

  // Send the confirmation email
  resend.emails.send({
    from: config.email.from,
    to: rsvp.email,
    replyTo: config.email.replyTo,
    subject: `Confirmed RSVP: ${event.title}`,
    html: `
      <p>Awesome! You've signed up for ${event.title}.</p>
      <p>We look forward to seeing you there!</p>
      <hr>
      <h2>Meetup details</h2>
      <p><strong>${event.title}</strong></p>
      <p>${event.description}</p>
      <p><strong>Location:</strong> ${event.location?.replace(/\r\n/gm, ' • ')}</p>
      <p><strong>Date:</strong>
        ${new Date(event.date!).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}
      </p>
      <p><strong>Time:</strong> ${event.time?.substring(0, 5)}</p>

      <p>Need to cancel? <a href="${cancellationLink}">Cancel</a></p>
    `
  });

  return NextResponse.json({}, { status: 200 });
}
