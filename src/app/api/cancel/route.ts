import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { createClient } from '@/utils/supabase/server';
import { CancelEmail } from '../../../emails/cancel';
import { render } from '@react-email/render';
import { revalidateEventAttendees } from '@/app/actions/revalidate';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { uuid } = await request.json();

  if (!uuid) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
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
    return NextResponse.json({ message: 'RSVP or event not found' }, { status: 404 });
  }

  // Check if the current user owns this RSVP (if logged in)
  const { data: { user } } = await supabase.auth.getUser();

  // Allow cancellation if: user owns the RSVP OR the RSVP has an email (legacy support)
  const canCancel = (user && rsvp.user_id === user.id) || rsvp.email;

  if (!canCancel) {
    return NextResponse.json({ message: 'Unauthorized to cancel this RSVP' }, { status: 403 });
  }

  // Cancel the RSVP in the database
  await supabase.from('events_rsvps')
    .update({
      canceled_at: new Date().toISOString(),
    })
    .eq('uuid', uuid);

  // Get email to send notification
  const recipientEmail = rsvp.email || user?.email;
  const recipientName = rsvp.name || user?.user_metadata?.full_name || 'Guest';

  if (recipientEmail) {
    // Send the cancellation confirmation email
    const emailResult = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: recipientEmail,
      replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
      subject: `Canceled RSVP: ${event.title}`,
      html: await render(CancelEmail({ fullName: recipientName, event })),
    });

    if (emailResult.error) {
      console.error('Email error:', emailResult.error);
      // Don't fail the request if email fails
    }
  }

  // Log the cancellation
  console.log(`❌ RSVP canceled with UUID: ${uuid}`);

  // Revalidate event attendee cache
  await revalidateEventAttendees();

  return NextResponse.json({}, { status: 200 });
}
