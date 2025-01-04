import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/utils/supabase/server";
import { decrypt } from "@/utils/encrypt";

import config from "@/app/api/config";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();

  const { event_id, email } = await request.json();

  if (!event_id || !email) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  // Get the event and check if it exists
  const { data: event } = await supabase.from('events').select().eq('id', event_id).single();

  if (!event) {
    return NextResponse.json({ message: "Event not found" }, { status: 404 });
  }

  let decryptedEmail;

  try {
    decryptedEmail = decrypt(email) as string;
  } catch (error: unknown) {
    console.error(error);

    let errorMessage;

    if (typeof error === "string") {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }

  // Confirm the RSVP into the database
  const result = await supabase.from('events_rsvps').update({
    confirmed_at: new Date().toISOString()
  }).eq('event_id', event_id).eq('email', decryptedEmail);

  if (result.error) {
    console.error(result.error);

    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  // Prepare the cancellation email link
  const cancellationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/cancel?email=${email}&event_id=${event_id}`;

  // Send the confirmation email
  resend.emails.send({
    from: config.email.from,
    to: decryptedEmail,
    replyTo: config.email.replyTo,
    subject: `Confirmed: ${event.title}`,
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
