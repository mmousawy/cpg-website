import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";

import { createClient } from "@/utils/supabase/server";
import { CancelEmail } from "../../../emails/cancel";

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
  const emailResult = await resend.emails.send({
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: rsvp.email,
    replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
    subject: `Canceled RSVP: ${event.title}`,
    html: await render(CancelEmail({ fullName: rsvp.name!, event })),
  });

  if (emailResult.error) {
    return NextResponse.json({ message: emailResult.error.message }, { status: 500 });
  }

  // Log the email sending
  console.log(`📨 Email "cancel" sent with UUID: ${uuid}`);

  return NextResponse.json({}, { status: 200 });
}
