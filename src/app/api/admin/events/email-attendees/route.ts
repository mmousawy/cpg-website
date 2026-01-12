import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/render";

import { createClient } from "@/utils/supabase/server";
import { AttendeeMessageEmail } from "@/emails/attendee-message";
import { encrypt } from "@/utils/encrypt";

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

  // Combine RSVPs and admins, deduplicate by email, and get user IDs for opt-out links
  const recipientMap = new Map<string, { email: string; name: string; userId?: string }>();

  // Add RSVPs
  if (rsvps) {
    rsvps.forEach((rsvp) => {
      if (rsvp.email) {
        recipientMap.set(rsvp.email.toLowerCase(), {
          email: rsvp.email,
          name: rsvp.name || rsvp.email.split('@')[0] || 'Friend',
          userId: rsvp.user_id || undefined,
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
          userId: admin.id,
        });
      }
    });
  }

  const recipients = Array.from(recipientMap.values());

  // Note: Attendee messages are functional emails for people who have RSVP'd
  // They should ALWAYS be sent, regardless of opt-out preferences
  // We still generate opt-out links for users who have opted in to show them the option
  const userIds = recipients.filter(r => r.userId).map(r => r.userId!);
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, email, newsletter_opt_in')
        .in('id', userIds)
        .eq('newsletter_opt_in', true)
    : { data: null };

  const optInUserIds = new Set(
    (profiles || []).map(p => p.id)
  );

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
        // Generate opt-out link for events type
        // Note: This email is still sent even if user has opted out (it's functional for RSVP'd users)
        // But we show the opt-out link so they can opt out of future announcements
        // Only encrypt userId and emailType to keep token smaller (email is looked up from userId)
        let optOutLink: string | undefined;
        if (recipient.userId) {
          try {
            const encrypted = encrypt(JSON.stringify({ 
              userId: recipient.userId, 
              emailType: 'events'
            }));
            optOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
          } catch (error) {
            console.error('Error generating opt-out link:', error);
          }
        }

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
              optOutLink,
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
