import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { ReportResolvedEmail } from '@/emails/report-resolved';
import { createNotification } from '@/lib/notifications/create';
import { encrypt } from '@/utils/encrypt';
import { adminSupabase } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, resolutionType, message } = body as {
      reportId: string;
      resolutionType?: string;
      message?: string;
    };

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

    // Only notify if report was resolved (not dismissed)
    if (report.status !== 'resolved') {
      return NextResponse.json({ success: true, notified: false });
    }

    // Get reporter info
    let reporterId: string | null = null;
    let reporterEmail: string | null = null;
    let reporterName: string | null = null;
    let reporterNickname: string | null = null;
    let reporterAvatarUrl: string | null = null;

    if (report.reporter_id) {
      // Authenticated reporter
      const { data: reporterProfile } = await adminSupabase
        .from('profiles')
        .select('full_name, nickname, avatar_url, email')
        .eq('id', report.reporter_id)
        .single();

      if (reporterProfile) {
        reporterId = report.reporter_id;
        reporterName = reporterProfile.full_name || reporterProfile.nickname || 'User';
        reporterNickname = reporterProfile.nickname;
        reporterAvatarUrl = reporterProfile.avatar_url;
        // Get email from auth.users
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(report.reporter_id);
        reporterEmail = authUser?.user?.email || null;
      }
    } else {
      // Anonymous reporter
      reporterEmail = report.reporter_email;
      reporterName = report.reporter_name || 'Anonymous User';
    }

    if (!reporterEmail) {
      // Can't notify without email
      return NextResponse.json({ success: true, notified: false, reason: 'No email' });
    }

    // Get entity details for context
    let entityTitle = report.entity_type;
    let entityThumbnail: string | null = null;
    let entityLink: string | null = null;
    let entityOwnerNickname: string | null = null;
    let entityShortId: string | null = null;
    let entityCreatedAt: string | null = null;
    let entityPhotoCount: number | null = null;

    if (report.entity_type === 'photo') {
      const { data: photo } = await adminSupabase
        .from('photos')
        .select('title, url, short_id, user_id, created_at')
        .eq('id', report.entity_id)
        .single();

      if (photo && photo.user_id) {
        const title = photo.title || 'Untitled';
        entityShortId = photo.short_id;
        // Store base title without short_id - we'll format it in the email template
        entityTitle = title;
        entityThumbnail = photo.url;
        entityCreatedAt = photo.created_at;
        const { data: ownerProfile } = await adminSupabase
          .from('profiles')
          .select('nickname')
          .eq('id', photo.user_id)
          .single();
        if (ownerProfile?.nickname) {
          entityOwnerNickname = ownerProfile.nickname;
          if (photo.short_id) {
            entityLink = `/@${ownerProfile.nickname}/photo/${photo.short_id}`;
          }
        }
      }
    } else if (report.entity_type === 'album') {
      const { data: album } = await adminSupabase
        .from('albums')
        .select('title, cover_image_url, slug, user_id, created_at')
        .eq('id', report.entity_id)
        .single();

      if (album && album.user_id) {
        const title = album.title || 'Untitled Album';
        entityTitle = title;
        entityThumbnail = album.cover_image_url;
        entityCreatedAt = album.created_at;
        const { data: ownerProfile } = await adminSupabase
          .from('profiles')
          .select('nickname')
          .eq('id', album.user_id)
          .single();
        if (ownerProfile?.nickname) {
          entityOwnerNickname = ownerProfile.nickname;
          if (album.slug) {
            entityLink = `/@${ownerProfile.nickname}/album/${album.slug}`;
          }
        }
        // Get photo count
        const { count } = await adminSupabase
          .from('album_photos')
          .select('*', { count: 'exact', head: true })
          .eq('album_id', report.entity_id);
        entityPhotoCount = count || 0;
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
          entityOwnerNickname = profile.nickname;
          entityLink = `/@${profile.nickname}`;
        }
      }
    }

    // Create in-app notification for authenticated reporters
    if (reporterId) {
      await createNotification({
        userId: reporterId,
        actorId: report.reviewed_by || null,
        type: 'report_resolved',
        entityType: 'report',
        entityId: report.id,
        data: {
          title: 'Your report has been resolved',
          thumbnail: entityThumbnail,
          link: entityLink || undefined,
          resolutionType,
          message,
          entityType: report.entity_type,
        },
      });
    }

    // Send email notification
    // Check email preferences for authenticated users
    // Always send report resolution emails - users cannot unsubscribe from report updates
    // since it's a user-triggered action and they need to know the status of their report
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    // Convert relative link to full URL for email
    const entityLinkFull = entityLink ? `${baseUrl}${entityLink}` : null;

    if (reporterEmail) {
      try {

        const html = await render(
          ReportResolvedEmail({
            reporterName: reporterName || 'User',
            reporterNickname,
            reporterAvatarUrl,
            entityType: report.entity_type as 'photo' | 'album' | 'profile' | 'comment',
            entityTitle,
            entityThumbnail,
            entityLink: entityLinkFull,
            entityOwnerNickname,
            entityShortId,
            entityCreatedAt,
            entityPhotoCount,
            reason: report.reason,
            resolutionType: resolutionType || 'Resolved',
            message,
            isAnonymous: !reporterId,
          }),
        );

        await resend.emails.send({
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          to: reporterEmail,
          subject: 'Your report has been resolved',
          html,
        });
      } catch (emailError) {
        console.error('Error sending report resolved email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      notified: true,
      inAppNotification: !!reporterId,
      emailSent: !!reporterEmail,
    });
  } catch (error) {
    console.error('Report resolved notification error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 },
    );
  }
}
