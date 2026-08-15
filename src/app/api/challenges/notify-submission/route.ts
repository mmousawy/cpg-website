import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { SubmissionNotificationEmail } from '@/emails/submission-notification';
import { createNotification } from '@/lib/notifications/create';
import { render } from '@react-email/render';
import { adminSupabase } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { challengeId, photoIds } = body as { challengeId: string; photoIds: string[] };

  if (!challengeId || !photoIds || photoIds.length === 0) {
    return NextResponse.json(
      { message: 'Challenge ID and photo IDs are required' },
      { status: 400 },
    );
  }

  const photoCount = photoIds.length;

  const { data: ownedPhotos, error: photosError } = await supabase
    .from('photos')
    .select('id')
    .in('id', photoIds)
    .eq('user_id', user.id);

  if (photosError || !ownedPhotos || ownedPhotos.length !== photoIds.length) {
    return NextResponse.json({ message: 'Invalid photo submission' }, { status: 403 });
  }

  const { data: submissions } = await supabase
    .from('challenge_submissions')
    .select('photo_id')
    .eq('challenge_id', challengeId)
    .in('photo_id', photoIds)
    .eq('user_id', user.id);

  if (!submissions || submissions.length !== photoIds.length) {
    return NextResponse.json({ message: 'Photos are not submitted to this challenge' }, { status: 403 });
  }

  // Fetch photo details for the email
  const { data: photos } = await supabase
    .from('photos')
    .select('id, url, title')
    .in('id', photoIds)
    .limit(6); // Limit to 6 photos for email display

  const photoUrls = (photos || []).map((p) => p.url);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

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
    ? `${baseUrl}/@${submitterNickname}`
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

  // Full URLs for emails
  const challengeLink = `${baseUrl}/challenges/${challenge.slug}`;
  const reviewLinkFull = `${baseUrl}/admin/challenges/${challenge.slug}/submissions`;
  // Relative URL for in-app notifications
  const reviewLinkRelative = `/admin/challenges/${challenge.slug}/submissions`;

  // Get all admin users (use admin client to bypass RLS for email access)
  const { data: admins, error: adminsError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_admin', true)
    .is('deletion_scheduled_at', null);

  if (adminsError) {
    console.error('Error fetching admins:', adminsError);
    return NextResponse.json({ message: 'Failed to fetch admins' }, { status: 500 });
  }

  if (!admins || admins.length === 0) {
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
        link: reviewLinkRelative,
        actorName: submitterName,
        actorNickname: submitterNickname,
        actorAvatar: submitterAvatarUrl,
        photoCount,
      },
    }),
  );

  await Promise.all(notificationPromises);

  const adminsToEmail = adminsToNotify.filter((admin) => Boolean(admin.email));

  if (adminsToEmail.length === 0) {
    return NextResponse.json({ success: true, notifiedCount: adminsToNotify.length });
  }

  // Send emails in batch
  try {
    const emailPromises = adminsToEmail.map(async (admin) => {
      const html = await render(
        SubmissionNotificationEmail({
          adminName: admin.full_name || 'Admin',
          submitterName,
          submitterNickname,
          submitterAvatarUrl,
          submitterProfileLink,
          photoCount,
          photoUrls,
          challengeTitle: challenge.title,
          challengeThumbnail: challenge.cover_image_url,
          challengeLink,
          reviewLink: reviewLinkFull,
        }),
      );

      return {
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
        replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
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
