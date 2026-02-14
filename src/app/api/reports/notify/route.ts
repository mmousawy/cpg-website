import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { ReportNotificationEmail } from '@/emails/report-notification';
import { createNotification } from '@/lib/notifications/create';
import { encrypt } from '@/utils/encrypt';
import { adminSupabase } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId } = body as { reportId: string };

    if (!reportId) {
      return NextResponse.json(
        { message: 'Report ID is required' },
        { status: 400 },
      );
    }

    // Fetch report details
    const { data: report, error: reportError } = await adminSupabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      console.error('Error fetching report:', reportError);
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    // Get reporter info
    let reporterName = 'Anonymous User';
    let reporterNickname: string | null = null;
    let reporterAvatarUrl: string | null = null;
    let reporterProfileLink: string | null = null;

    if (report.reporter_id) {
      // Authenticated reporter
      const { data: reporterProfile } = await adminSupabase
        .from('profiles')
        .select('full_name, nickname, avatar_url')
        .eq('id', report.reporter_id)
        .single();

      if (reporterProfile) {
        reporterName = reporterProfile.full_name || reporterProfile.nickname || 'User';
        reporterNickname = reporterProfile.nickname;
        reporterAvatarUrl = reporterProfile.avatar_url;
        reporterProfileLink = reporterNickname ? `/@${reporterNickname}` : null;
      }
    } else {
      // Anonymous reporter
      reporterName = report.reporter_name || 'Anonymous User';
    }

    // Get entity details based on type
    let entityTitle = report.entity_type;
    let entityThumbnail: string | null = null;
    let entityLink: string | null = null;

    if (report.entity_type === 'photo') {
      const { data: photo } = await adminSupabase
        .from('photos')
        .select('title, url, short_id, user_id')
        .eq('id', report.entity_id)
        .single();

      if (photo && photo.user_id) {
        entityTitle = photo.title || 'Photo';
        entityThumbnail = photo.url;
        const { data: ownerProfile } = await adminSupabase
          .from('profiles')
          .select('nickname')
          .eq('id', photo.user_id)
          .single();
        if (ownerProfile?.nickname && photo.short_id) {
          entityLink = `/@${ownerProfile.nickname}/photo/${photo.short_id}`;
        }
      }
    } else if (report.entity_type === 'album') {
      const { data: album } = await adminSupabase
        .from('albums')
        .select('title, cover_image_url, slug, user_id')
        .eq('id', report.entity_id)
        .single();

      if (album && album.user_id) {
        entityTitle = album.title || 'Album';
        entityThumbnail = album.cover_image_url;
        const { data: ownerProfile } = await adminSupabase
          .from('profiles')
          .select('nickname')
          .eq('id', album.user_id)
          .single();
        if (ownerProfile?.nickname && album.slug) {
          entityLink = `/@${ownerProfile.nickname}/album/${album.slug}`;
        }
      }
    } else if (report.entity_type === 'profile') {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, nickname, avatar_url')
        .eq('id', report.entity_id)
        .single();

      if (profile) {
        entityTitle = profile.full_name || profile.nickname || 'Profile';
        entityThumbnail = profile.avatar_url;
        if (profile.nickname) {
          entityLink = `/@${profile.nickname}`;
        }
      }
    } else if (report.entity_type === 'comment') {
      // Comments don't have direct links, but we can show the parent entity
      entityTitle = 'Comment';
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const reviewLinkRelative = '/admin/reports';
    const reviewLinkFull = `${baseUrl}/admin/reports`;

    // Get all admin users
    const { data: admins, error: adminsError } = await adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_admin', true);

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
      return NextResponse.json({ message: 'Failed to fetch admins' }, { status: 500 });
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({ success: true, notifiedCount: 0 });
    }

    // Create in-app notifications for all admins (use relative links)
    const notificationPromises = admins.map((admin) =>
      createNotification({
        userId: admin.id,
        actorId: report.reporter_id || null,
        type: 'report_submitted',
        entityType: 'report',
        entityId: report.id,
        data: {
          title: `Report: ${entityTitle}`,
          thumbnail: entityThumbnail,
          link: reviewLinkRelative,
          actorName: reporterName,
          actorNickname: reporterNickname,
          actorAvatar: reporterAvatarUrl,
          entityType: report.entity_type,
          reason: report.reason,
          isAnonymous: !report.reporter_id,
        },
      }),
    );

    await Promise.all(notificationPromises);

    // Check email preferences and send emails
    const { data: emailPreferences } = await adminSupabase
      .from('email_preferences')
      .select('user_id')
      .eq('type_key', 'admin_notifications')
      .eq('enabled', false);

    const optedOutUserIds = new Set((emailPreferences || []).map((p) => p.user_id));

    // Filter admins who haven't opted out
    const adminsToEmail = admins.filter(
      (admin) => admin.email && !optedOutUserIds.has(admin.id),
    );

    if (adminsToEmail.length === 0) {
      return NextResponse.json({ success: true, notifiedCount: admins.length });
    }

    // Send emails in batch (use full URLs for emails)
    // Convert relative links to full URLs for email
    const reporterProfileLinkFull = reporterProfileLink ? `${baseUrl}${reporterProfileLink}` : null;
    const entityLinkFull = entityLink ? `${baseUrl}${entityLink}` : null;

    try {
      const emailPromises = adminsToEmail.map(async (admin) => {
        const optOutToken = encrypt(JSON.stringify({
          userId: admin.id,
          emailType: 'admin_notifications',
        }));
        const optOutLink = `${baseUrl}/unsubscribe/${encodeURIComponent(optOutToken)}`;

        const html = await render(
          ReportNotificationEmail({
            adminName: admin.full_name || 'Admin',
            reporterName,
            reporterNickname,
            reporterEmail: report.reporter_email,
            reporterAvatarUrl,
            reporterProfileLink: reporterProfileLinkFull,
            entityType: report.entity_type as 'photo' | 'album' | 'profile' | 'comment',
            entityTitle,
            entityThumbnail,
            entityLink: entityLinkFull,
            reason: report.reason,
            details: report.details,
            reviewLink: reviewLinkFull,
            optOutLink,
            isAnonymous: !report.reporter_id,
          }),
        );

        return {
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          to: admin.email!,
          subject: `New Report: ${reporterName} reported ${entityTitle}`,
          html,
        };
      });

      const emails = await Promise.all(emailPromises);

      if (emails.length > 0) {
        await resend.batch.send(emails);
      }
    } catch (emailError) {
      console.error('Error sending report notification emails:', emailError);
    }

    return NextResponse.json({
      success: true,
      notifiedCount: admins.length,
      emailedCount: adminsToEmail.length,
    });
  } catch (error) {
    console.error('Report notification error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 },
    );
  }
}
