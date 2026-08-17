import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { createAdminClient } from '@/utils/supabase/admin';
import { ConfirmEmail } from '../../../emails/confirm';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { render } from '@react-email/render';
import { revalidateEventAttendees } from '@/app/actions/revalidate';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const adminClient = createAdminClient();

  const { uuid } = await request.json();

  if (!uuid) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const { data: rsvpPayload } = await adminClient.rpc('get_rsvp_by_uuid', { p_uuid: uuid });
  const payload = rsvpPayload as { rsvp?: Record<string, unknown>; event?: Record<string, unknown> } | null;
  const rsvp = payload?.rsvp ?? null;
  const event = payload?.event ?? null;

  if (!rsvp || !event || event.is_draft === true) {
    return NextResponse.json({ message: 'RSVP or event not found' }, { status: 404 });
  }

  // Check if already confirmed
  if (rsvp.confirmed_at) {
    return NextResponse.json({ message: 'RSVP already confirmed' }, { status: 200 });
  }

  // Get email recipient
  const recipientEmail = rsvp.email as string;
  const recipientName = (rsvp.name as string | null) || 'Guest';

  if (!recipientEmail) {
    return NextResponse.json({ message: 'No email associated with this RSVP' }, { status: 400 });
  }

  // Confirm the RSVP in the database
  const result = await adminClient.from('events_rsvps')
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
  if (!shouldSkipNotificationsAndEmails(recipientEmail)) {
    const emailResult = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: recipientEmail,
      replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
      subject: `Confirmed RSVP: ${event.title as string}`,
      html: await render(ConfirmEmail({ fullName: recipientName, event: event as never, cancellationLink })),
    });

    if (emailResult.error) {
      console.error('Email error:', emailResult.error);
      // Don't fail - RSVP is already confirmed
    }
  }

  // Log the email sending
  console.log(`📨 Email "confirm" sent with UUID: ${uuid}`);

  // Revalidate event attendee cache
  await revalidateEventAttendees();

  return NextResponse.json({}, { status: 200 });
}
