import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';

import { createClient } from '@/utils/supabase/server';
import { SubmissionNotificationEmail } from '@/emails/submission-notification';
import { encrypt } from '@/utils/encrypt';
import { createNotification } from '@/lib/notifications/create';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { challengeId, photoCount } = body;

  if (!challengeId || !photoCount) {
    return NextResponse.json(
      { message: 'Challenge ID and photo count are required' },
      { status: 400 },
    );
  }

  // Get submitter info
  const { data: submitterProfile } = await supabase
    .from('profiles')
    .select('full_name, nickname, avatar_url')
    .eq('id', user.id)
    .single();

  const submitterName = submitterProfile?.full_name || user.email?.split('@')[0] || 'Someone';
  const submitterNickname = submitterProfile?.nickname || null;
  const submitterAvatarUrl = submitterProfile?.avatar_url || null;
  const submitterProfileLink = submitterNickname
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/@${submitterNickname}`
    : null;

  // Get challenge info
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id, title, slug, cover_image_url')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) {
    console.error('Error fetching challenge:', challengeError);
    return NextResponse.json({ message: 'Challenge not found' }, { status: 404 });
  }

  const challengeLink = `${process.env.NEXT_PUBLIC_SITE_URL}/challenges/${challenge.slug}`;
  const reviewLink = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/challenges/${challenge.slug}/submissions`;

  // Get all admin users
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_admin', true);

  if (adminsError) {
    console.error('Error fetching admins:', adminsError);
    return NextResponse.json({ message: 'Failed to fetch admins' }, { status: 500 });
  }

  if (!admins || admins.length === 0) {
    // No admins to notify, just return success
    return NextResponse.json({ success: true, notifiedCount: 0 });
  }

  // Notify all admins (including the submitter if they're an admin)
  const adminsToNotify = admins;

  // Create in-app notifications for all admins
  const notificationPromises = adminsToNotify.map((admin) =>
    createNotification({
      userId: admin.id,
      actorId: user.id,
      type: 'new_submission',
      entityType: 'challenge',
      entityId: challenge.id,
      data: {
        title: challenge.title,
        thumbnail: challenge.cover_image_url,
        link: reviewLink,
        actorName: submitterName,
        actorNickname: submitterNickname,
        actorAvatar: submitterAvatarUrl,
        photoCount,
      },
    }),
  );

  await Promise.all(notificationPromises);

  // Check email preferences and send emails
  // Get admin email preferences for admin notifications
  const { data: emailPreferences } = await supabase
    .from('email_preferences')
    .select('user_id')
    .eq('type_key', 'admin_notifications')
    .eq('enabled', false);

  const optedOutUserIds = new Set((emailPreferences || []).map((p) => p.user_id));

  // Filter admins who haven't opted out of admin notification emails
  const adminsToEmail = adminsToNotify.filter(
    (admin) => admin.email && !optedOutUserIds.has(admin.id),
  );

  if (adminsToEmail.length === 0) {
    return NextResponse.json({ success: true, notifiedCount: adminsToNotify.length });
  }

  // Send emails in batch
  try {
    const emailPromises = adminsToEmail.map(async (admin) => {
      const optOutToken = encrypt(JSON.stringify({
        email: admin.email,
        type: 'admin_notifications',
      }));
      const optOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${optOutToken}`;

      const html = await render(
        SubmissionNotificationEmail({
          adminName: admin.full_name || 'Admin',
          submitterName,
          submitterNickname,
          submitterAvatarUrl,
          submitterProfileLink,
          photoCount,
          challengeTitle: challenge.title,
          challengeThumbnail: challenge.cover_image_url,
          challengeLink,
          reviewLink,
          optOutLink,
        }),
      );

      return {
        from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
        to: admin.email!,
        subject: `New submission: ${submitterName} submitted to "${challenge.title}"`,
        html,
      };
    });

    const emails = await Promise.all(emailPromises);

    if (emails.length > 0) {
      await resend.batch.send(emails);
    }
  } catch (emailError) {
    // Log but don't fail the request if email sending fails
    console.error('Error sending submission notification emails:', emailError);
  }

  return NextResponse.json({
    success: true,
    notifiedCount: adminsToNotify.length,
    emailedCount: adminsToEmail.length,
  });
}
