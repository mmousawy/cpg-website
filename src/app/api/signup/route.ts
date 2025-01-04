import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/utils/supabase/server";
import { encrypt } from "@/utils/encrypt";

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

  // Prepare the confirmation email link
  const encryptedEmail = encrypt(email);
  const confirmLink = `${process.env.NEXT_PUBLIC_SITE_URL}/confirm?email=${encryptedEmail}&event_id=${event_id}`;

  // Insert the RSVP into the database
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

  // Send the confirmation email
  resend.emails.send({
    from: config.email.from,
    to: email,
    replyTo: config.email.replyTo,
    subject: `Sign up for: ${event.title}`,
    html: `
      <p>Confirm that you want to sign up for the event ${event.title}.</p>
      <p><a href="${confirmLink}">Confirm</a></p>
    `
  });

  return NextResponse.json({}, { status: 200 });
}
