import { render } from "@react-email/render";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { EventAnnouncementEmail } from "@/emails/event-announcement";
import { encrypt } from "@/utils/encrypt";
import { createClient } from "@/utils/supabase/server";

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
  const { eventId } = body;

  if (!eventId) {
    return NextResponse.json({ message: "Event ID is required" }, { status: 400 });
  }

  // Check if announcement already sent
  const { data: existingAnnouncement } = await supabase
    .from('event_announcements')
    .select('id')
    .eq('event_id', eventId)
    .single();

  if (existingAnnouncement) {
    return NextResponse.json(
      { message: "This event has already been announced" },
      { status: 400 },
    );
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
      { status: 404 },
    );
  }

  // Build event link
  const eventLink = `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event.slug || event.id}`;

  // Fetch only users who have RSVP'd to this event (for testing purposes)
  const { data: rsvps, error: rsvpsError } = await supabase
    .from('events_rsvps')
    .select('user_id, email, name, profiles!inner(id, email, full_name, newsletter_opt_in)')
    .eq('event_id', eventId)
    .not('confirmed_at', 'is', null)
    .is('canceled_at', null)
    .not('email', 'is', null);

  if (rsvpsError) {
    console.error('Error fetching RSVPs:', rsvpsError);
    return NextResponse.json(
      { message: "Failed to fetch RSVPs" },
      { status: 500 },
    );
  }

  if (!rsvps || rsvps.length === 0) {
    return NextResponse.json(
      { message: "No confirmed RSVPs found for this event" },
      { status: 400 },
    );
  }

  // Build subscribers list from RSVPs
  const subscribersMap = new Map<string, { id: string; email: string; full_name: string | null }>();

  rsvps.forEach((rsvp: any) => {
    const profile = rsvp.profiles;
    if (profile && profile.email) {
      // Prefer profile data, fallback to RSVP data
      subscribersMap.set(profile.id, {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || rsvp.name || null,
      });
    } else if (rsvp.email) {
      // If no profile, use RSVP email (but we need a user_id for opt-out links)
      // For RSVPs without profiles, we'll skip opt-out links
      if (rsvp.user_id) {
        subscribersMap.set(rsvp.user_id, {
          id: rsvp.user_id,
          email: rsvp.email,
          full_name: rsvp.name || null,
        });
      }
    }
  });

  let subscribers = Array.from(subscribersMap.values());

  // Filter out suspended users
  if (subscribers.length > 0) {
    const userIds = subscribers.map(s => s.id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds)
      .is('suspended_at', null);

    if (profiles) {
      const activeUserIds = new Set(profiles.map(p => p.id));
      subscribers = subscribers.filter(s => activeUserIds.has(s.id));
    }
  }

  // Filter out users who have opted out of "events" email type
  // Event announcements are the only event emails that can be opted out of
  if (subscribers.length > 0) {
    const userIds = subscribers.map(s => s.id);

    // First get the events email type ID
    const { data: eventsEmailType } = await supabase
      .from('email_types' as any)
      .select('id')
      .eq('type_key', 'events')
      .single();

    if (eventsEmailType && userIds.length > 0) {
      const eventsEmailTypeId = (eventsEmailType as any).id;
      // Then get users who have opted out
      const { data: optedOutUsers } = await supabase
        .from('email_preferences' as any)
        .select('user_id')
        .in('user_id', userIds)
        .eq('email_type_id', eventsEmailTypeId)
        .eq('opted_out', true);

      if (optedOutUsers && optedOutUsers.length > 0) {
        const optedOutUserIds = new Set((optedOutUsers as any[]).map((u: any) => u.user_id));
        // Filter out opted-out users
        subscribers = subscribers.filter(s => !optedOutUserIds.has(s.id));
      }
    }
  }

  if (subscribers.length === 0) {
    return NextResponse.json(
      { message: "No subscribers found (all have opted out of event announcements or no valid RSVPs)" },
      { status: 400 },
    );
  }

  // Send emails in batches (Resend has rate limits)
  const batchSize = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const emailPromises = batch.map(async (subscriber) => {
      try {
        const fullName = subscriber.full_name || subscriber.email?.split('@')[0] || 'Friend';

        // Generate opt-out link for events type (event announcements)
        // Only encrypt userId and emailType to keep token smaller (email is looked up from userId)
        let optOutLink: string | undefined;
        if (subscriber.id) {
          try {
            const encrypted = encrypt(JSON.stringify({
              userId: subscriber.id,
              emailType: 'events',
            }));
            optOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
          } catch (error) {
            console.error('Error generating opt-out link:', error);
          }
        }

        const emailResult = await resend.emails.send({
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          to: subscriber.email!,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          subject: `New Event: ${event.title}`,
          html: await render(
            EventAnnouncementEmail({
              fullName,
              event,
              eventLink,
              optOutLink,
            }),
          ),
        });

        if (emailResult.error) {
          console.error(`Failed to send email to ${subscriber.email}:`, emailResult.error);
          errorCount++;
          return false;
        }

        successCount++;
        return true;
      } catch (err) {
        console.error(`Error sending email to ${subscriber.email}:`, err);
        errorCount++;
        return false;
      }
    });

    await Promise.all(emailPromises);

    // Small delay between batches to respect rate limits
    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Record announcement in tracking table
  const { error: announcementError } = await supabase
    .from('event_announcements')
    .insert({
      event_id: eventId,
      announced_by: user.id,
      recipient_count: successCount,
    });

  if (announcementError) {
    console.error('Error recording announcement:', announcementError);
    // Don't fail the request if tracking fails
  }

  return NextResponse.json({
    success: true,
    sent: successCount,
    failed: errorCount,
    total: subscribers.length,
  }, { status: 200 });
}
