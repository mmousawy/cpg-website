import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { AttendeeMessageEmail } from '@/emails/attendee-message';
import { encrypt } from '@/utils/encrypt';
import { createClient } from '@/utils/supabase/server';

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
  const { eventId, message, recipientEmails } = body;

  if (!eventId) {
    return NextResponse.json({ message: 'Event ID is required' }, { status: 400 });
  }

  if (!message || !message.trim()) {
    return NextResponse.json({ message: 'Message is required' }, { status: 400 });
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
      { message: 'Failed to fetch RSVPs' },
      { status: 500 },
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
      { message: 'Failed to fetch admin profiles' },
      { status: 500 },
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

  let allRecipients = Array.from(recipientMap.values());

  // If recipientEmails is provided, filter to only those recipients
  // Otherwise, send to all recipients (backward compatibility)
  const recipients = recipientEmails && Array.isArray(recipientEmails) && recipientEmails.length > 0
    ? allRecipients.filter(r => recipientEmails.includes(r.email))
    : allRecipients;

  // Note: Attendee messages are functional emails for people who have RSVP'd
  // They should ALWAYS be sent, regardless of opt-out preferences
  // We still generate opt-out links so users can opt out of future event announcements

  if (recipients.length === 0) {
    return NextResponse.json(
      { message: 'No recipients found for this event' },
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

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    // Prepare batch emails
    const batchEmails = await Promise.all(
      batch.map(async (recipient) => {
        // Generate opt-out link for events type
        // Note: This email is still sent even if user has opted out (it's functional for RSVP'd users)
        // But we show the opt-out link so they can opt out of future announcements
        // Only encrypt userId and emailType to keep token smaller (email is looked up from userId)
        let optOutLink: string | undefined;
        if (recipient.userId) {
          try {
            const encrypted = encrypt(JSON.stringify({
              userId: recipient.userId,
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
          subject: `Update about: ${event.title}`,
          html: await render(
            AttendeeMessageEmail({
              fullName: recipient.name,
              event,
              message: message.trim(),
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
        batch.forEach((recipient) => {
          sendStatus[recipient.email] = 'error';
          errorDetails[recipient.email] = errorMessage;
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
            const recipient = batch[idx];
            if (!recipient) {
              console.warn(`No recipient found at index ${idx} in batch`);
              return;
            }

            if (result && typeof result === 'object') {
              // Check if it's an error response
              if ('error' in result && result.error) {
                type ResendError = string | { message?: string } | Error;
                const error = result.error as ResendError;
                const errorMessage = typeof error === 'string'
                  ? error
                  : error instanceof Error
                    ? error.message
                    : (error as { message?: string }).message || JSON.stringify(error);
                console.error(`Failed to send email to ${recipient.email}:`, error);
                sendStatus[recipient.email] = 'error';
                errorDetails[recipient.email] = errorMessage;
                errorCount++;
              } else if ('id' in result) {
                // Success - has an id
                sendStatus[recipient.email] = 'success';
                successCount++;
              } else {
                // Unknown response format - log it and treat as error
                const errorMessage = `Unexpected response format: ${JSON.stringify(result)}`;
                console.warn(`Unexpected response format for ${recipient.email}:`, errorMessage);
                sendStatus[recipient.email] = 'error';
                errorDetails[recipient.email] = errorMessage;
                errorCount++;
              }
            } else {
              // Not an object - treat as error
              const errorMessage = `Unexpected response type: ${typeof result}`;
              console.warn(`Unexpected response type for ${recipient.email}:`, typeof result, result);
              sendStatus[recipient.email] = 'error';
              errorDetails[recipient.email] = errorMessage;
              errorCount++;
            }
          });
        } else {
          // No data array found - mark all as errors
          const errorMessage = 'No data array found in batch response';
          console.error(`No data array found in batch response starting at index ${i}. Response:`, JSON.stringify(batchResult, null, 2));
          batch.forEach((recipient) => {
            sendStatus[recipient.email] = 'error';
            errorDetails[recipient.email] = errorMessage;
          });
          errorCount += batch.length;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Error sending batch starting at index ${i}:`, err);
      // Mark all emails in batch as failed
      batch.forEach((recipient) => {
        sendStatus[recipient.email] = 'error';
        errorDetails[recipient.email] = errorMessage;
      });
      errorCount += batch.length;
    }

    // Small delay between batches to respect rate limits (2 requests per second = 500ms delay)
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return NextResponse.json({
    success: true,
    sent: successCount,
    failed: errorCount,
    total: recipients.length,
    sendStatus, // Per-recipient send status
    errorDetails, // Per-recipient error details
  }, { status: 200 });
}
