import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";

import { createClient } from "@/utils/supabase/server";
import { ConfirmEmail } from "../../../emails/confirm";
import { revalidateEventAttendees } from "@/app/actions/revalidate";

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
    .eq('id', rsvp?.event_id || -1)
    .single();

  if (!rsvp || !event) {
    return NextResponse.json({ message: "RSVP or event not found" }, { status: 404 });
  }

  // Check if already confirmed
  if (rsvp.confirmed_at) {
    return NextResponse.json({ message: "RSVP already confirmed" }, { status: 200 });
  }

  // Get email recipient
  const recipientEmail = rsvp.email;
  const recipientName = rsvp.name || 'Guest';

  if (!recipientEmail) {
    return NextResponse.json({ message: "No email associated with this RSVP" }, { status: 400 });
  }

  // Confirm the RSVP in the database
  const result = await supabase.from('events_rsvps')
    .update({
      confirmed_at: new Date().toISOString(),
    })
    .eq('uuid', uuid);

  if (result.error) {
    console.error(result.error);
    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  // Prepare the cancellation email link
  const cancellationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/cancel/${uuid}`;

  // Send the confirmation email
  const emailResult = await resend.emails.send({
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: recipientEmail,
    replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
    subject: `Confirmed RSVP: ${event.title}`,
    html: await render(ConfirmEmail({ fullName: recipientName, event, cancellationLink })),
  });

  if (emailResult.error) {
    console.error('Email error:', emailResult.error);
    // Don't fail - RSVP is already confirmed
  }

  // Log the email sending
  console.log(`📨 Email "confirm" sent with UUID: ${uuid}`);

  // Revalidate event attendee cache
  await revalidateEventAttendees();

  return NextResponse.json({}, { status: 200 });
}
