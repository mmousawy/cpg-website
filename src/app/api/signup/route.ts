import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/utils/supabase/server";
import { SignupEmail } from "../../../emails/signup";

import config from "@/app/api/config";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { event_id, name, email } = await request.json();

  const ipAddress = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for");

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
    return NextResponse.json({ message: "You have already signed up for this event. Check your email inbox for a confirmation." }, { status: 400 });
  }

  // Insert the RSVP into the database
  const result = await supabase.from('events_rsvps')
    .insert({
      event_id: event_id,
      name: name,
      email: email,
      ip_address: ipAddress,
    })
    .select()
    .single();

  if (result.error) {
    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  // Prepare the confirmation email link
  const confirmLink = `${process.env.NEXT_PUBLIC_SITE_URL}/confirm/${result.data.uuid}`;

  // Send the confirmation email
  resend.emails.send({
    from: config.email.from,
    to: email,
    replyTo: config.email.replyTo,
    subject: `Sign up for: ${event.title}`,
    html: await render(SignupEmail({fullName: name, event, confirmLink})),
  });

  return NextResponse.json({}, { status: 200 });
}
