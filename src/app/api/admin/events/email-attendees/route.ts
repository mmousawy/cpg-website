import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";

import { createClient } from "@/utils/supabase/server";
import { AttendeeMessageEmail } from "@/emails/attendee-message";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { eventId, message } = body;

  if (!eventId) {
    return NextResponse.json({ message: "Event ID is required" }, { status: 400 });
  }

  if (!message || !message.trim()) {
    return NextResponse.json({ message: "Message is required" }, { status: 400 });
  }

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { message: "Event not found" },
      { status: 404 }
    );
  }

  // Build event link
  const eventLink = `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event.slug || event.id}`;

  // Fetch confirmed RSVPs
  const { data: rsvps, error: rsvpsError } = await supabase
    .from('events_rsvps')
    .select('id, email, name, user_id')
    .eq('event_id', eventId)
    .not('confirmed_at', 'is', null)
    .is('canceled_at', null)
    .not('email', 'is', null);

  if (rsvpsError) {
    console.error('Error fetching RSVPs:', rsvpsError);
    return NextResponse.json(
      { message: "Failed to fetch RSVPs" },
      { status: 500 }
    );
  }

  // Fetch all admin profiles (hosts)
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('is_admin', true)
    .is('suspended_at', null)
    .not('email', 'is', null);

  if (adminsError) {
    console.error('Error fetching admins:', adminsError);
    return NextResponse.json(
      { message: "Failed to fetch admin profiles" },
      { status: 500 }
    );
  }

  // Combine RSVPs and admins, deduplicate by email
  const recipientMap = new Map<string, { email: string; name: string }>();

  // Add RSVPs
  if (rsvps) {
    rsvps.forEach((rsvp) => {
      if (rsvp.email) {
        recipientMap.set(rsvp.email.toLowerCase(), {
          email: rsvp.email,
          name: rsvp.name || rsvp.email.split('@')[0] || 'Friend',
        });
      }
    });
  }

  // Add admins (will overwrite if already in map, which is fine)
  if (admins) {
    admins.forEach((admin) => {
      if (admin.email) {
        recipientMap.set(admin.email.toLowerCase(), {
          email: admin.email,
          name: admin.full_name || admin.email.split('@')[0] || 'Friend',
        });
      }
    });
  }

  const recipients = Array.from(recipientMap.values());

  if (recipients.length === 0) {
    return NextResponse.json(
      { message: "No recipients found for this event" },
      { status: 400 }
    );
  }

  // Send emails in batches
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const emailPromises = batch.map(async (recipient) => {
      try {
        const emailResult = await resend.emails.send({
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          to: recipient.email,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          subject: `Update about: ${event.title}`,
          html: await render(
            AttendeeMessageEmail({
              fullName: recipient.name,
              event,
              message: message.trim(),
              eventLink,
            })
          ),
        });

        if (emailResult.error) {
          console.error(`Failed to send email to ${recipient.email}:`, emailResult.error);
          errorCount++;
          return false;
        }

        successCount++;
        return true;
      } catch (err) {
        console.error(`Error sending email to ${recipient.email}:`, err);
        errorCount++;
        return false;
      }
    });

    await Promise.all(emailPromises);

    // Small delay between batches to respect rate limits
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return NextResponse.json({
    success: true,
    sent: successCount,
    failed: errorCount,
    total: recipients.length,
  }, { status: 200 });
}
