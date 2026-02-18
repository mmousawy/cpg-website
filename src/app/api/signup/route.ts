import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { createClient } from '@/utils/supabase/server';
import { ConfirmEmail } from '../../../emails/confirm';
import { render } from '@react-email/render';
import { revalidateEventAttendees } from '@/app/actions/revalidate';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'You must be logged in to sign up for events' }, { status: 401 });
  }

  const { event_id } = await request.json();
  const ipAddress = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for');

  if (!event_id) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guest';

  // Get the event and check if it exists
  const { data: event } = await supabase.from('events').select().eq('id', event_id).single();

  if (!event) {
    return NextResponse.json({ message: 'Event not found' }, { status: 404 });
  }

  // Check if the user has already signed up for the event
  // RSVP cannot be canceled
  const { data: existingRSVP } = await supabase.from('events_rsvps')
    .select()
    .eq('event_id', event_id)
    .eq('user_id', user.id)
    .is('canceled_at', null)
    .single();

  if (existingRSVP) {
    return NextResponse.json({ message: 'You have already signed up for this event.' }, { status: 400 });
  }

  // Insert the RSVP into the database - already confirmed since user is authenticated
  const result = await supabase.from('events_rsvps')
    .insert({
      event_id: event_id,
      user_id: user.id,
      name: userName,
      email: user.email,
      ip_address: ipAddress,
      confirmed_at: new Date().toISOString(), // Auto-confirm for authenticated users
    })
    .select()
    .single();

  if (result.error) {
    return NextResponse.json({ message: result.error.message }, { status: 500 });
  }

  // Prepare the cancellation email link
  const cancellationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/cancel/${result.data.uuid}`;

  // Send the confirmation email
  const emailResult = await resend.emails.send({
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: user.email!,
    replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
    subject: `Confirmed RSVP: ${event.title}`,
    html: await render(ConfirmEmail({ fullName: userName, event, cancellationLink })),
  });

  if (emailResult.error) {
    console.error('Email error:', emailResult.error);
    // Don't fail the request if email fails - RSVP is already confirmed
  }

  // Log the signup
  console.log(`✅ RSVP confirmed for user ${user.id} to event ${event_id}`);

  // Revalidate event attendee cache
  await revalidateEventAttendees();

  return NextResponse.json({ success: true }, { status: 200 });
}
