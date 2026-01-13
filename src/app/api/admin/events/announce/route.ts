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

  // Fetch all active profiles (not suspended, with email)
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .is('suspended_at', null)
    .not('email', 'is', null);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return NextResponse.json(
      { message: "Failed to fetch profiles" },
      { status: 500 },
    );
  }

  if (!allProfiles || allProfiles.length === 0) {
    return NextResponse.json(
      { message: "No active members found" },
      { status: 400 },
    );
  }

  // Get the events email type ID
  const { data: eventsEmailType } = await supabase
    .from('email_types' as any)
    .select('id')
    .eq('type_key', 'events')
    .single();

  if (!eventsEmailType) {
    return NextResponse.json(
      { message: "Events email type not found" },
      { status: 500 },
    );
  }

  const eventsEmailTypeId = (eventsEmailType as any).id;

  // Get all users who have opted out of "events" email type
  const { data: optedOutUsers } = await supabase
    .from('email_preferences' as any)
    .select('user_id')
    .eq('email_type_id', eventsEmailTypeId)
    .eq('opted_out', true);

  const optedOutUserIds = new Set(
    (optedOutUsers || []).map((u: any) => u.user_id)
  );

  // Filter out users who have opted out
  const subscribers = allProfiles
    .filter(profile => !optedOutUserIds.has(profile.id))
    .map(profile => ({
      id: profile.id,
      email: profile.email!,
      full_name: profile.full_name || null,
    }));

  if (subscribers.length === 0) {
    return NextResponse.json(
      { message: "No subscribers found (all members have opted out of event announcements)" },
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
