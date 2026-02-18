import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { ChallengeAnnouncementEmail } from '@/emails/challenge-announcement';
import { revalidateChallenges } from '@/app/actions/revalidate';
import { encrypt } from '@/utils/encrypt';
import { render } from '@react-email/render';
import { createClient } from '@/utils/supabase/server';
import { createNotification } from '@/lib/notifications/create';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

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
  const { challengeId, recipientEmails } = body;

  if (!challengeId) {
    return NextResponse.json({ message: 'Challenge ID is required' }, { status: 400 });
  }

  // Get the challenge
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ message: 'Challenge not found' }, { status: 404 });
  }

  // Build challenge link
  const challengeLink = `${process.env.NEXT_PUBLIC_SITE_URL}/challenges/${challenge.slug}`;

  // Fetch all active profiles
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .is('suspended_at', null)
    .not('email', 'is', null);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return NextResponse.json({ message: 'Failed to fetch profiles' }, { status: 500 });
  }

  if (!allProfiles || allProfiles.length === 0) {
    return NextResponse.json({ message: 'No active members found' }, { status: 400 });
  }

  // Get the photo_challenges email type ID
  const { data: challengesEmailType } = await supabase
    .from('email_types')
    .select('id')
    .eq('type_key', 'photo_challenges')
    .single();

  if (!challengesEmailType) {
    return NextResponse.json(
      { message: 'Photo challenges email type not found' },
      { status: 500 },
    );
  }

  // Get all users who have opted out
  const { data: optedOutUsers } = await supabase
    .from('email_preferences')
    .select('user_id')
    .eq('email_type_id', challengesEmailType.id)
    .eq('opted_out', true);

  const optedOutUserIds = new Set(
    (optedOutUsers || []).map((u: { user_id: string }) => u.user_id),
  );

  // Filter out opted-out users
  let allSubscribers = allProfiles
    .filter((profile) => !optedOutUserIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      email: profile.email!,
      full_name: profile.full_name || null,
    }));

  // If recipientEmails provided, filter to only those
  const subscribers =
    recipientEmails && Array.isArray(recipientEmails) && recipientEmails.length > 0
      ? allSubscribers.filter((s) => recipientEmails.includes(s.email))
      : allSubscribers;

  if (subscribers.length === 0) {
    return NextResponse.json(
      { message: 'No subscribers found' },
      { status: 400 },
    );
  }

  // Send emails in batches
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
        const fullName =
          subscriber.full_name || subscriber.email?.split('@')[0] || 'Friend';

        // Generate opt-out link
        let optOutLink: string | undefined;
        if (subscriber.id) {
          try {
            const encrypted = encrypt(
              JSON.stringify({
                userId: subscriber.id,
                emailType: 'photo_challenges',
              }),
            );
            optOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
          } catch (error) {
            console.error('Error generating opt-out link:', error);
          }
        }

        return {
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          to: subscriber.email!,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          subject: `New Photo Challenge: ${challenge.title}`,
          html: await render(
            ChallengeAnnouncementEmail({
              fullName,
              challenge: {
                title: challenge.title,
                prompt: challenge.prompt,
                ends_at: challenge.ends_at,
                cover_image_url: challenge.cover_image_url,
              },
              challengeLink,
              optOutLink,
            }),
          ),
        };
      }),
    );

    try {
      const batchResult = await resend.batch.send(batchEmails);

      if (batchResult.error) {
        const error = batchResult.error as { message?: string };
        const errorMessage = error.message || JSON.stringify(error);
        batch.forEach((subscriber) => {
          sendStatus[subscriber.email!] = 'error';
          errorDetails[subscriber.email!] = errorMessage;
        });
        errorCount += batch.length;
      } else {
        const resultsArray = batchResult.data?.data || batchResult.data;

        if (resultsArray && Array.isArray(resultsArray)) {
          resultsArray.forEach((result: { id?: string; error?: unknown }, idx: number) => {
            const subscriber = batch[idx];
            if (!subscriber) return;

            if (result && typeof result === 'object') {
              if ('error' in result && result.error) {
                const error = result.error as { message?: string };
                const errorMessage = error.message || JSON.stringify(error);
                sendStatus[subscriber.email!] = 'error';
                errorDetails[subscriber.email!] = errorMessage;
                errorCount++;
              } else if ('id' in result) {
                sendStatus[subscriber.email!] = 'success';
                successCount++;
                successfulSubscribers.push({ id: subscriber.id });
              }
            }
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      batch.forEach((subscriber) => {
        sendStatus[subscriber.email!] = 'error';
        errorDetails[subscriber.email!] = errorMessage;
      });
      errorCount += batch.length;
    }

    // Delay between batches
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Create notifications for successful sends
  if (successfulSubscribers.length > 0) {
    const notificationPromises = successfulSubscribers.map((subscriber) =>
      createNotification({
        userId: subscriber.id,
        actorId: user.id,
        type: 'challenge_announced',
        entityType: 'challenge',
        entityId: challenge.id,
        data: {
          title: challenge.title,
          thumbnail: challenge.cover_image_url,
          link: `/challenges/${challenge.slug}`,
        },
      }).catch((error) => {
        console.error(`Failed to create notification for user ${subscriber.id}:`, error);
        return { success: false, error: String(error) };
      }),
    );

    await Promise.all(notificationPromises);
  }

  // Record announcement
  await supabase.from('challenge_announcements').insert({
    challenge_id: challengeId,
    announced_by: user.id,
    recipient_count: successCount,
  });

  // Update challenge announced_at
  await supabase
    .from('challenges')
    .update({ announced_at: new Date().toISOString() })
    .eq('id', challengeId);

  // Revalidate challenges cache so announced_at is reflected
  await revalidateChallenges();

  return NextResponse.json(
    {
      success: true,
      sent: successCount,
      failed: errorCount,
      total: subscribers.length,
      sendStatus,
      errorDetails,
    },
    { status: 200 },
  );
}
