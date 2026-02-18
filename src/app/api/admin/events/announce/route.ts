import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { EventAnnouncementEmail } from '@/emails/event-announcement';
import { revalidateEvents } from '@/app/actions/revalidate';
import { encrypt } from '@/utils/encrypt';
import { render } from '@react-email/render';
import { createClient } from '@/utils/supabase/server';
import { createNotification } from '@/lib/notifications/create';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { eventId, recipientEmails } = body;

  if (!eventId) {
    return NextResponse.json({ message: 'Event ID is required' }, { status: 400 });
  }

  // Get the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json(
      { message: 'Event not found' },
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
      { message: 'Failed to fetch profiles' },
      { status: 500 },
    );
  }

  if (!allProfiles || allProfiles.length === 0) {
    return NextResponse.json(
      { message: 'No active members found' },
      { status: 400 },
    );
  }

  console.log(`📊 Found ${allProfiles.length} active profiles`);

  // Get the events email type ID
  const { data: eventsEmailType } = await supabase
    .from('email_types')
    .select('id')
    .eq('type_key', 'events')
    .single();

  if (!eventsEmailType) {
    return NextResponse.json(
      { message: 'Events email type not found' },
      { status: 500 },
    );
  }

  const eventsEmailTypeId = eventsEmailType.id;

  // Get all users who have opted out of "events" email type
  const { data: optedOutUsers, error: optedOutError } = await supabase
    .from('email_preferences')
    .select('user_id')
    .eq('email_type_id', eventsEmailTypeId)
    .eq('opted_out', true);

  if (optedOutError) {
    console.error('Error fetching opted-out users:', optedOutError);
  }

  const optedOutUserIds = new Set(
    (optedOutUsers || []).map((u: { user_id: string }) => u.user_id),
  );

  console.log(`🚫 Found ${optedOutUserIds.size} users who have opted out`);

  // Filter out users who have opted out
  // Note: Users without a preference record are considered opted IN (default behavior)
  let allSubscribers = allProfiles
    .filter(profile => !optedOutUserIds.has(profile.id))
    .map(profile => ({
      id: profile.id,
      email: profile.email!,
      full_name: profile.full_name || null,
    }));

  // If recipientEmails is provided, filter to only those recipients
  // Otherwise, send to all subscribers (backward compatibility)
  const subscribers = recipientEmails && Array.isArray(recipientEmails) && recipientEmails.length > 0
    ? allSubscribers.filter(s => recipientEmails.includes(s.email))
    : allSubscribers;

  console.log(`✅ ${subscribers.length} subscribers after filtering (${allProfiles.length - allSubscribers.length} opted out, ${recipientEmails && Array.isArray(recipientEmails) ? `${allSubscribers.length - subscribers.length} unselected` : 'all selected'})`);

  if (subscribers.length === 0) {
    return NextResponse.json(
      { message: 'No subscribers found (all members have opted out of event announcements)' },
      { status: 400 },
    );
  }

  // Send emails in batches using Resend's batch API (up to 100 emails per request)
  // This avoids rate limit issues (2 requests per second)
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  const sendStatus: Record<string, 'success' | 'error'> = {};
  const errorDetails: Record<string, string> = {};
  const successfulSubscribers: Array<{ id: string }> = [];

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    // Prepare batch emails
    const batchEmails = await Promise.all(
      batch.map(async (subscriber) => {
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

        return {
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
        };
      }),
    );

    // Send batch using Resend's batch API
    try {
      const batchResult = await resend.batch.send(batchEmails);

      if (batchResult.error) {
        type ResendError = string | { message?: string } | Error;
        const error = batchResult.error as ResendError;
        const errorMessage = typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : (error as { message?: string }).message || JSON.stringify(error);
        console.error(`Failed to send batch starting at index ${i}:`, error);
        // Mark all emails in batch as failed
        batch.forEach((subscriber) => {
          sendStatus[subscriber.email!] = 'error';
          errorDetails[subscriber.email!] = errorMessage;
        });
        errorCount += batch.length;
      } else {
        // Resend batch API returns: batchResult.data.data (nested data array)
        // Each item in the array corresponds to the email at the same index
        const resultsArray = batchResult.data?.data || batchResult.data;

        if (resultsArray && Array.isArray(resultsArray)) {
          type ResendBatchResult = {
            id?: string;
            error?: string | { message?: string } | Error;
          };

          resultsArray.forEach((result: ResendBatchResult, idx: number) => {
            const subscriber = batch[idx];
            if (!subscriber) {
              console.warn(`No subscriber found at index ${idx} in batch`);
              return;
            }

            if (result && typeof result === 'object') {
              if ('error' in result && result.error) {
                // Error in result object
                type ResendError = string | { message?: string } | Error;
                const error = result.error as ResendError;
                const errorMessage = typeof error === 'string'
                  ? error
                  : error instanceof Error
                    ? error.message
                    : (error as { message?: string }).message || JSON.stringify(error);
                console.error(`Failed to send email to ${subscriber.email}:`, error);
                sendStatus[subscriber.email!] = 'error';
                errorDetails[subscriber.email!] = errorMessage;
                errorCount++;
              } else if ('id' in result) {
                // Success - has an id
                sendStatus[subscriber.email!] = 'success';
                successCount++;
                // Track successful subscribers for notification creation
                successfulSubscribers.push({ id: subscriber.id });
              } else {
                // Unknown format - log and treat as error
                const errorMessage = `Unexpected response format: ${JSON.stringify(result)}`;
                console.warn(`Unexpected response format for ${subscriber.email}:`, errorMessage);
                sendStatus[subscriber.email!] = 'error';
                errorDetails[subscriber.email!] = errorMessage;
                errorCount++;
              }
            } else {
              // Not an object - treat as error
              const errorMessage = `Unexpected response type: ${typeof result}`;
              console.warn(`Unexpected response type for ${subscriber.email}:`, typeof result, result);
              sendStatus[subscriber.email!] = 'error';
              errorDetails[subscriber.email!] = errorMessage;
              errorCount++;
            }
          });
        } else {
          // No data array found - mark all as errors
          const errorMessage = 'No data array found in batch response';
          console.error(`No data array found in batch response starting at index ${i}. Response:`, JSON.stringify(batchResult, null, 2));
          batch.forEach((subscriber) => {
            sendStatus[subscriber.email!] = 'error';
            errorDetails[subscriber.email!] = errorMessage;
          });
          errorCount += batch.length;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Error sending batch starting at index ${i}:`, err);
      // Mark all emails in batch as failed
      batch.forEach((subscriber) => {
        sendStatus[subscriber.email!] = 'error';
        errorDetails[subscriber.email!] = errorMessage;
      });
      errorCount += batch.length;
    }

    // Small delay between batches to respect rate limits (2 requests per second = 500ms delay)
    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Create notifications for successful email sends
  if (successfulSubscribers.length > 0) {
    const notificationPromises = successfulSubscribers.map(subscriber =>
      createNotification({
        userId: subscriber.id,
        actorId: user.id,
        type: 'event_announcement',
        entityType: 'event',
        entityId: String(event.id),
        data: {
          title: event.title ?? undefined,
          thumbnail: event.cover_image ?? undefined,
          link: `/events/${event.slug || event.id}`,
        },
      }).catch((error) => {
        console.error(`Failed to create notification for user ${subscriber.id}:`, error);
        return { success: false, error: String(error) };
      }),
    );

    await Promise.all(notificationPromises);
    console.log(`📬 Created ${successfulSubscribers.length} notifications for event announcement`);
  }

  // Record announcement in tracking table
  // Note: We use upsert with ON CONFLICT DO NOTHING since we allow multiple announcements
  // The unique constraint on event_id prevents duplicates, but we want to allow multiple sends
  // So we'll just skip the insert if it already exists (this is just for tracking)
  const { error: announcementError } = await supabase
    .from('event_announcements')
    .insert({
      event_id: eventId,
      announced_by: user.id,
      recipient_count: successCount,
    })
    .select()
    .single();

  if (announcementError) {
    // If it's a duplicate key error, that's fine - we allow multiple announcements
    // For other errors, log them but don't fail the request
    if (announcementError.code !== '23505') {
      console.error('Error recording announcement:', announcementError);
    }
    // Don't fail the request if tracking fails
  }

  // Revalidate events cache so announcement tracking is reflected
  await revalidateEvents();

  console.log(`📧 Email sending complete: ${successCount} sent, ${errorCount} failed, ${subscribers.length} total`);

  return NextResponse.json({
    success: true,
    sent: successCount,
    failed: errorCount,
    total: subscribers.length,
    totalProfiles: allProfiles.length,
    optedOut: optedOutUserIds.size,
    sendStatus, // Per-recipient send status
    errorDetails, // Per-recipient error details
  }, { status: 200 });
}
