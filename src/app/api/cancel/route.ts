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
    canceled_at: new Date().toISOString()
  }).eq('event_id', event_id).eq('email', decryptedEmail);

  if (result.error) {
    console.error(result.error);

    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  // Send the confirmation email
  resend.emails.send({
    from: config.email.from,
    to: decryptedEmail,
    replyTo: config.email.replyTo,
    subject: `Cancelled RSVP: ${event.title}`,
    html: `
      <p>You've successfully cancelled your RSVP. We'll miss you!</p>
      <p>If you change your mind, you can always sign up again.</p>
    `
  });

  return NextResponse.json({}, { status: 200 });
}
