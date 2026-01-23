import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { WeeklyDigestEmail } from '@/emails/weekly-digest';
import { encrypt } from '@/utils/encrypt';
import { createAdminClient } from '@/utils/supabase/admin';
import type { NotificationWithActor } from '@/types/notifications';

const resend = new Resend(process.env.RESEND_API_KEY!);
const BATCH_SIZE = 100;

type UserDigest = {
  userId: string;
  email: string;
  fullName: string | null;
  notifications: NotificationWithActor[];
  totalCount: number;
};

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

  const supabase = createAdminClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all users with unseen notifications from past 7 days
  const { data: notificationsData, error: notificationsError } = await supabase
    .from('notifications')
    .select(`
      id,
      user_id,
      actor_id,
      type,
      entity_type,
      entity_id,
      data,
      seen_at,
      created_at,
      actor:profiles!notifications_actor_id_fkey(nickname, avatar_url, full_name)
    `)
    .is('seen_at', null)
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false });

  if (notificationsError) {
    console.error('Error fetching notifications for weekly digest:', notificationsError);
    return NextResponse.json(
      { message: 'Failed to fetch notifications', error: notificationsError.message },
      { status: 500 },
    );
  }

  if (!notificationsData || notificationsData.length === 0) {
    return NextResponse.json({
      message: 'No notifications to send',
      sent: 0,
      timestamp: now.toISOString(),
    });
  }

  // Group notifications by user
  const userNotificationsMap = new Map<string, NotificationWithActor[]>();

  notificationsData.forEach((notification) => {
    const userId = notification.user_id;
    if (!userNotificationsMap.has(userId)) {
      userNotificationsMap.set(userId, []);
    }
    userNotificationsMap.get(userId)!.push({
      ...notification,
      actor: notification.actor || null,
    } as NotificationWithActor);
  });

  // Get email preferences for weekly_digest type
  const { data: weeklyDigestEmailType } = await supabase
    .from('email_types')
    .select('id')
    .eq('type_key', 'weekly_digest')
    .single();

  if (!weeklyDigestEmailType) {
    return NextResponse.json(
      { message: 'Weekly digest email type not found' },
      { status: 500 },
    );
  }

  // Get user profiles for all users with notifications
  const userIds = Array.from(userNotificationsMap.keys());
  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  const userProfilesMap = new Map(
    (userProfiles || []).map((profile) => [profile.id, profile]),
  );

  // Batch fetch all email preferences at once (instead of N queries in loop)
  const { data: allPreferences } = await supabase
    .from('email_preferences')
    .select('user_id, opted_out')
    .in('user_id', userIds)
    .eq('email_type_id', weeklyDigestEmailType.id);

  const preferencesMap = new Map(
    (allPreferences || []).map((p) => [p.user_id, p.opted_out]),
  );

  // Build user digests
  const userDigests: UserDigest[] = [];

  for (const [userId, notifications] of userNotificationsMap.entries()) {
    const userProfile = userProfilesMap.get(userId);

    if (!userProfile?.email) {
      continue;
    }

    // Check if user has opted out (using pre-fetched map)
    if (preferencesMap.get(userId) === true) {
      continue;
    }

    userDigests.push({
      userId,
      email: userProfile.email,
      fullName: userProfile.full_name,
      notifications: notifications.slice(0, 5), // Top 5 for email
      totalCount: notifications.length,
    });
  }

  if (userDigests.length === 0) {
    return NextResponse.json({
      message: 'No eligible users for weekly digest',
      sent: 0,
      timestamp: now.toISOString(),
    });
  }

  // Send emails in batches
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < userDigests.length; i += BATCH_SIZE) {
    const batch = userDigests.slice(i, i + BATCH_SIZE);

    const emails = await Promise.all(
      batch.map(async (digest) => {
        // Generate unsubscribe link
        let unsubscribeUrl: string | undefined;
        try {
          const encrypted = encrypt(JSON.stringify({
            userId: digest.userId,
            emailType: 'weekly_digest',
          }));
          unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
        } catch (error) {
          console.error(`Error generating unsubscribe link for ${digest.email}:`, error);
        }

        const activityPageUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/account/activity`;

        return {
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          to: digest.email,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          subject: `You have ${digest.totalCount} new notification${digest.totalCount === 1 ? '' : 's'}`,
          html: await render(
            WeeklyDigestEmail({
              recipientName: digest.fullName || digest.email.split('@')[0] || 'Friend',
              notifications: digest.notifications,
              totalCount: digest.totalCount,
              activityPageUrl,
              unsubscribeUrl,
            }),
          ),
        };
      }),
    );

    try {
      const result = await resend.batch.send(emails);

      if (result.error) {
        console.error('Error sending weekly digest batch:', result.error);
        failed += batch.length;
      } else {
        sent += batch.length;
        console.log(`📨 Weekly digest sent to ${batch.length} users`);
      }
    } catch (error) {
      console.error('Exception sending weekly digest batch:', error);
      failed += batch.length;
    }

    // Rate limit: wait 500ms between batches
    if (i + BATCH_SIZE < userDigests.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return NextResponse.json({
    message: 'Weekly digest sent',
    sent,
    failed,
    totalUsers: userDigests.length,
    timestamp: now.toISOString(),
  });
}
