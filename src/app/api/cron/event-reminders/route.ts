import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { AttendeeReminderEmail } from '@/emails/attendee-reminder';
import { RsvpReminderEmail } from '@/emails/rsvp-reminder';
import { encrypt } from '@/utils/encrypt';
import { createClient } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET(request: NextRequest) {
  // Verify cron secret from Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json(
      { message: 'Cron secret not configured' },
      { status: 500 },
    );
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calculate dates: 5 days from now and 1 day from now
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(today.getDate() + 5);
  const fiveDaysDateStr = fiveDaysFromNow.toISOString().split('T')[0];

  const oneDayFromNow = new Date(today);
  oneDayFromNow.setDate(today.getDate() + 1);
  const oneDayDateStr = oneDayFromNow.toISOString().split('T')[0];

  const results = {
    timestamp: now.toISOString(),
    rsvpReminders: { sent: 0, failed: 0, events: [] as number[] },
    attendeeReminders: { sent: 0, failed: 0, events: [] as number[] },
  };

  try {
    // Get the events email type ID for filtering
    const { data: eventsEmailType } = await supabase
      .from('email_types')
      .select('id')
      .eq('type_key', 'events')
      .single();

    if (!eventsEmailType) {
      console.error('Events email type not found');
      return NextResponse.json(
        { message: 'Events email type not found', ...results },
        { status: 500 },
      );
    }

    const eventsEmailTypeId = eventsEmailType.id;

    // Get users who have opted out of "events" email type
    const { data: optedOutUsers } = await supabase
      .from('email_preferences')
      .select('user_id')
      .eq('email_type_id', eventsEmailTypeId)
      .eq('opted_out', true);

    const optedOutUserIds = new Set(
      (optedOutUsers || []).map((u: { user_id: string }) => u.user_id),
    );

    // ===== RSVP REMINDERS (5 days before) =====
    const { data: rsvpReminderEvents, error: rsvpEventsError } = await supabase
      .from('events')
      .select('id, title, slug, date, time, location, description, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, attendee_reminder_sent_at, rsvp_reminder_sent_at')
      .eq('date', fiveDaysDateStr)
      .is('rsvp_reminder_sent_at', null);

    if (rsvpEventsError) {
      console.error('Error fetching RSVP reminder events:', rsvpEventsError);
    } else if (rsvpReminderEvents && rsvpReminderEvents.length > 0) {
      console.log(`📅 Found ${rsvpReminderEvents.length} events needing RSVP reminders (5 days before)`);

      for (const event of rsvpReminderEvents) {
        try {
          // Get all active profiles (not suspended, with email)
          const { data: allProfiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .is('suspended_at', null)
            .not('email', 'is', null);

          if (!allProfiles || allProfiles.length === 0) {
            console.log(`No active profiles found for event ${event.id}`);
            continue;
          }

          // Get existing RSVPs for this event
          const { data: existingRsvps } = await supabase
            .from('events_rsvps')
            .select('user_id, email')
            .eq('event_id', event.id)
            .not('confirmed_at', 'is', null)
            .is('canceled_at', null);

          const existingRsvpUserIds = new Set(
            (existingRsvps || [])
              .map(r => r.user_id)
              .filter((id): id is string => id !== null),
          );
          const existingRsvpEmails = new Set(
            (existingRsvps || [])
              .map(r => r.email?.toLowerCase())
              .filter((email): email is string => !!email),
          );

          // Filter: users with events opted-in, exclude existing RSVPs
          const recipients = allProfiles
            .filter(profile =>
              !optedOutUserIds.has(profile.id) &&
              !existingRsvpUserIds.has(profile.id) &&
              profile.email &&
              !existingRsvpEmails.has(profile.email.toLowerCase()),
            )
            .map(profile => ({
              id: profile.id,
              email: profile.email!,
              name: profile.full_name || (profile.email ? profile.email.split('@')[0] : 'Friend') || 'Friend',
            }));

          if (recipients.length === 0) {
            console.log(`No recipients for RSVP reminder event ${event.id}`);
            // Still mark as sent to avoid retrying
            await supabase
              .from('events')
              .update({ rsvp_reminder_sent_at: now.toISOString() })
              .eq('id', event.id);
            continue;
          }

          console.log(`📧 Sending RSVP reminders to ${recipients.length} recipients for event: ${event.title}`);

          const eventLink = `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event.slug || event.id}`;
          const batchSize = 100;
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);

            const batchEmails = await Promise.all(
              batch.map(async (recipient) => {
                let optOutLink: string | undefined;
                if (recipient.id) {
                  try {
                    const encrypted = encrypt(JSON.stringify({
                      userId: recipient.id,
                      emailType: 'events',
                    }));
                    optOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
                  } catch (error) {
                    console.error('Error generating opt-out link:', error);
                  }
                }

                return {
                  from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
                  to: recipient.email,
                  replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
                  subject: `Reminder: ${event.title}`,
                  html: await render(
                    RsvpReminderEmail({
                      fullName: recipient.name,
                      event,
                      eventLink,
                      optOutLink,
                    }),
                  ),
                };
              }),
            );

            try {
              const batchResult = await resend.batch.send(batchEmails);

              if (batchResult.error) {
                console.error(`Failed to send RSVP reminder batch for event ${event.id}:`, batchResult.error);
                errorCount += batch.length;
              } else {
                const resultsArray = batchResult.data?.data || batchResult.data;
                type ResendBatchResult = {
                  id?: string;
                  error?: string | { message?: string } | Error;
                };

                if (resultsArray && Array.isArray(resultsArray)) {
                  resultsArray.forEach((result: ResendBatchResult) => {
                    if (result && typeof result === 'object' && 'error' in result && result.error) {
                      errorCount++;
                    } else if (result && typeof result === 'object' && 'id' in result) {
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  });
                } else {
                  errorCount += batch.length;
                }
              }
            } catch (err) {
              console.error(`Error sending RSVP reminder batch for event ${event.id}:`, err);
              errorCount += batch.length;
            }

            // Rate limiting delay
            if (i + batchSize < recipients.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // Mark as sent if we had any successful sends
          if (successCount > 0) {
            await supabase
              .from('events')
              .update({ rsvp_reminder_sent_at: now.toISOString() })
              .eq('id', event.id);
            results.rsvpReminders.sent += successCount;
            results.rsvpReminders.events.push(event.id);
          }
          results.rsvpReminders.failed += errorCount;

          console.log(`✅ RSVP reminders for event ${event.id}: ${successCount} sent, ${errorCount} failed`);
        } catch (err) {
          console.error(`Error processing RSVP reminder for event ${event.id}:`, err);
          results.rsvpReminders.failed++;
        }
      }
    }

    // ===== ATTENDEE REMINDERS (1 day before) =====
    const { data: attendeeReminderEvents, error: attendeeEventsError } = await supabase
      .from('events')
      .select('id, title, slug, date, time, location, description, cover_image, created_at, image_blurhash, image_height, image_url, image_width, max_attendees, rsvp_count, attendee_reminder_sent_at, rsvp_reminder_sent_at')
      .eq('date', oneDayDateStr)
      .is('attendee_reminder_sent_at', null);

    if (attendeeEventsError) {
      console.error('Error fetching attendee reminder events:', attendeeEventsError);
    } else if (attendeeReminderEvents && attendeeReminderEvents.length > 0) {
      console.log(`📅 Found ${attendeeReminderEvents.length} events needing attendee reminders (1 day before)`);

      for (const event of attendeeReminderEvents) {
        try {
          // Get confirmed RSVPs for this event
          const { data: rsvps } = await supabase
            .from('events_rsvps')
            .select('id, uuid, email, name, user_id')
            .eq('event_id', event.id)
            .not('confirmed_at', 'is', null)
            .is('canceled_at', null)
            .not('email', 'is', null);

          if (!rsvps || rsvps.length === 0) {
            console.log(`No confirmed RSVPs for attendee reminder event ${event.id}`);
            // Still mark as sent to avoid retrying
            await supabase
              .from('events')
              .update({ attendee_reminder_sent_at: now.toISOString() })
              .eq('id', event.id);
            continue;
          }

          console.log(`📧 Sending attendee reminders to ${rsvps.length} recipients for event: ${event.title}`);

          const batchSize = 100;
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < rsvps.length; i += batchSize) {
            const batch = rsvps.slice(i, i + batchSize);

            const batchEmails = await Promise.all(
              batch.map(async (rsvp) => {
                const cancellationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/cancel/${rsvp.uuid}`;
                const recipientName = rsvp.name || rsvp.email?.split('@')[0] || 'Friend';

                return {
                  from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
                  to: rsvp.email!,
                  replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
                  subject: `See you tomorrow! ${event.title}`,
                  html: await render(
                    AttendeeReminderEmail({
                      fullName: recipientName,
                      event,
                      cancellationLink,
                    }),
                  ),
                };
              }),
            );

            try {
              const batchResult = await resend.batch.send(batchEmails);

              if (batchResult.error) {
                console.error(`Failed to send attendee reminder batch for event ${event.id}:`, batchResult.error);
                errorCount += batch.length;
              } else {
                const resultsArray = batchResult.data?.data || batchResult.data;
                type ResendBatchResult = {
                  id?: string;
                  error?: string | { message?: string } | Error;
                };

                if (resultsArray && Array.isArray(resultsArray)) {
                  resultsArray.forEach((result: ResendBatchResult) => {
                    if (result && typeof result === 'object' && 'error' in result && result.error) {
                      errorCount++;
                    } else if (result && typeof result === 'object' && 'id' in result) {
                      successCount++;
                    } else {
                      errorCount++;
                    }
                  });
                } else {
                  errorCount += batch.length;
                }
              }
            } catch (err) {
              console.error(`Error sending attendee reminder batch for event ${event.id}:`, err);
              errorCount += batch.length;
            }

            // Rate limiting delay
            if (i + batchSize < rsvps.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // Mark as sent if we had any successful sends
          if (successCount > 0) {
            await supabase
              .from('events')
              .update({ attendee_reminder_sent_at: now.toISOString() })
              .eq('id', event.id);
            results.attendeeReminders.sent += successCount;
            results.attendeeReminders.events.push(event.id);
          }
          results.attendeeReminders.failed += errorCount;

          console.log(`✅ Attendee reminders for event ${event.id}: ${successCount} sent, ${errorCount} failed`);
        } catch (err) {
          console.error(`Error processing attendee reminder for event ${event.id}:`, err);
          results.attendeeReminders.failed++;
        }
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Error in event reminders cron:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        ...results,
      },
      { status: 500 },
    );
  }
}
