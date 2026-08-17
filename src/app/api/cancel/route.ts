import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { CancelEmail } from '../../../emails/cancel';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { render } from '@react-email/render';
import { revalidateEventAttendees } from '@/app/actions/revalidate';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
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

  const { data: { user } } = await supabase.auth.getUser();

  const canCancel = (user && rsvp.user_id === user.id) || rsvp.email;

  if (!canCancel) {
    return NextResponse.json({ message: 'Unauthorized to cancel this RSVP' }, { status: 403 });
  }

  await adminClient.from('events_rsvps')
    .update({
      canceled_at: new Date().toISOString(),
    })
    .eq('uuid', uuid);

  const recipientEmail = (rsvp.email as string | null) || user?.email;
  const recipientName = (rsvp.name as string | null) || user?.user_metadata?.full_name || 'Guest';

  if (recipientEmail && !shouldSkipNotificationsAndEmails(recipientEmail)) {
    // Send the cancellation confirmation email
    const emailResult = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: recipientEmail,
      replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
      subject: `Canceled RSVP: ${event.title as string}`,
      html: await render(CancelEmail({ fullName: recipientName, event: event as never })),
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
