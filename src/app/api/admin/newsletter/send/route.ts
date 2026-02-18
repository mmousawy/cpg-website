import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { NewsletterEmail } from '@/emails/newsletter';
import { encrypt } from '@/utils/encrypt';
import { render } from '@react-email/render';
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
    .select('is_admin, email')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { subject, body: newsletterBody, recipientEmails, testEmail } = body;

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return NextResponse.json({ message: 'Subject is required' }, { status: 400 });
  }

  if (!newsletterBody || typeof newsletterBody !== 'string' || !newsletterBody.trim()) {
    return NextResponse.json({ message: 'Body is required' }, { status: 400 });
  }

  const trimmedSubject = subject.trim();
  const trimmedBody = newsletterBody.trim();

  // Test email mode: send only to the admin's own email
  if (testEmail) {
    const adminEmail = profile.email || user.email;
    if (!adminEmail) {
      return NextResponse.json(
        { message: 'Cannot send test email: no email address found for your account' },
        { status: 400 },
      );
    }

    const fullName = 'Test Recipient';
    let optOutLink: string | undefined;
    try {
      const encrypted = encrypt(JSON.stringify({
        userId: user.id,
        emailType: 'newsletter',
      }));
      optOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
    } catch (error) {
      console.error('Error generating opt-out link:', error);
    }

    try {
      const html = await render(
        NewsletterEmail({
          subject: trimmedSubject,
          body: trimmedBody,
          fullName,
          optOutLink,
        }),
      );

      const { error } = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: adminEmail,
        replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
        subject: `[Test] ${trimmedSubject}`,
        html,
      });

      if (error) {
        console.error('Failed to send test email:', error);
        return NextResponse.json(
          { message: typeof error === 'string' ? error : (error as { message?: string }).message || 'Failed to send test email' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        sent: 1,
        failed: 0,
        total: 1,
        testEmail: true,
        message: `Test email sent to ${adminEmail}`,
      }, { status: 200 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error sending test email:', err);
      return NextResponse.json(
        { message: errorMessage },
        { status: 500 },
      );
    }
  }

  // Full send mode: fetch subscribers and send to selected recipients
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, newsletter_opt_in')
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

  // Get the newsletter email type ID
  const { data: newsletterEmailType } = await supabase
    .from('email_types')
    .select('id')
    .eq('type_key', 'newsletter')
    .single();

  if (!newsletterEmailType) {
    return NextResponse.json(
      { message: 'Newsletter email type not found' },
      { status: 500 },
    );
  }

  const newsletterEmailTypeId = newsletterEmailType.id;

  // Get all users who have opted out of newsletter
  const { data: optedOutUsers, error: optedOutError } = await supabase
    .from('email_preferences')
    .select('user_id')
    .eq('email_type_id', newsletterEmailTypeId)
    .eq('opted_out', true);

  if (optedOutError) {
    console.error('Error fetching opted-out users:', optedOutError);
  }

  const optedOutUserIds = new Set(
    (optedOutUsers || []).map((u: { user_id: string }) => u.user_id),
  );

  // Exclude users who opted out via email_preferences OR legacy newsletter_opt_in
  const allSubscribers = allProfiles
    .filter(p => !optedOutUserIds.has(p.id) && (p.newsletter_opt_in !== false))
    .map(p => ({
      id: p.id,
      email: p.email!,
      full_name: p.full_name || null,
    }));

  const subscribers = recipientEmails && Array.isArray(recipientEmails) && recipientEmails.length > 0
    ? allSubscribers.filter(s => recipientEmails.includes(s.email))
    : allSubscribers;

  if (subscribers.length === 0) {
    return NextResponse.json(
      { message: 'No subscribers found (all members have opted out of newsletter)' },
      { status: 400 },
    );
  }

  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  const sendStatus: Record<string, 'success' | 'error'> = {};
  const errorDetails: Record<string, string> = {};

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const batchEmails = await Promise.all(
      batch.map(async (subscriber) => {
        const fullName = subscriber.full_name || subscriber.email?.split('@')[0] || 'Friend';

        let optOutLink: string | undefined;
        if (subscriber.id) {
          try {
            const encrypted = encrypt(JSON.stringify({
              userId: subscriber.id,
              emailType: 'newsletter',
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
          subject: trimmedSubject,
          html: await render(
            NewsletterEmail({
              subject: trimmedSubject,
              body: trimmedBody,
              fullName,
              optOutLink,
            }),
          ),
        };
      }),
    );

    try {
      const batchResult = await resend.batch.send(batchEmails);

      if (batchResult.error) {
        type ResendError = string | { message?: string } | Error;
        const err = batchResult.error as ResendError;
        const errorMessage = typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : (err as { message?: string }).message || JSON.stringify(err);
        console.error(`Failed to send batch starting at index ${i}:`, batchResult.error);
        batch.forEach((subscriber) => {
          sendStatus[subscriber.email!] = 'error';
          errorDetails[subscriber.email!] = errorMessage;
        });
        errorCount += batch.length;
      } else {
        const resultsArray = batchResult.data?.data || batchResult.data;

        if (resultsArray && Array.isArray(resultsArray)) {
          type ResendBatchResult = {
            id?: string;
            error?: string | { message?: string } | Error;
          };

          resultsArray.forEach((result: ResendBatchResult, idx: number) => {
            const subscriber = batch[idx];
            if (!subscriber) return;

            if (result && typeof result === 'object') {
              if ('error' in result && result.error) {
                type ResendError = string | { message?: string } | Error;
                const err = result.error as ResendError;
                const errorMessage = typeof err === 'string'
                  ? err
                  : err instanceof Error
                    ? err.message
                    : (err as { message?: string }).message || JSON.stringify(err);
                sendStatus[subscriber.email!] = 'error';
                errorDetails[subscriber.email!] = errorMessage;
                errorCount++;
              } else if ('id' in result) {
                sendStatus[subscriber.email!] = 'success';
                successCount++;
              } else {
                const errorMessage = `Unexpected response format: ${JSON.stringify(result)}`;
                sendStatus[subscriber.email!] = 'error';
                errorDetails[subscriber.email!] = errorMessage;
                errorCount++;
              }
            } else {
              const errorMessage = `Unexpected response type: ${typeof result}`;
              sendStatus[subscriber.email!] = 'error';
              errorDetails[subscriber.email!] = errorMessage;
              errorCount++;
            }
          });
        } else {
          const errorMessage = 'No data array found in batch response';
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
      batch.forEach((subscriber) => {
        sendStatus[subscriber.email!] = 'error';
        errorDetails[subscriber.email!] = errorMessage;
      });
      errorCount += batch.length;
    }

    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`📧 Newsletter sending complete: ${successCount} sent, ${errorCount} failed, ${subscribers.length} total`);

  return NextResponse.json({
    success: true,
    sent: successCount,
    failed: errorCount,
    total: subscribers.length,
    totalProfiles: allProfiles.length,
    optedOut: optedOutUserIds.size,
    sendStatus,
    errorDetails,
  }, { status: 200 });
}
