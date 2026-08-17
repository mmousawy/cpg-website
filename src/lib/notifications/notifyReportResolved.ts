import { Resend } from 'resend';
import { render } from '@react-email/render';

import { ReportResolvedEmail } from '@/emails/report-resolved';
import { isTestEmail } from '@/lib/auth/isTestEmail';
import { createNotification } from '@/lib/notifications/create';
import { adminSupabase } from '@/utils/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function notifyReportResolved(
  reportId: string,
  resolutionType?: string,
  message?: string,
): Promise<{ success: boolean; notified: boolean; inAppNotification?: boolean; emailSent?: boolean; reason?: string }> {
  const { data: report, error: reportError } = await adminSupabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    console.error('Error fetching report:', reportError);
    throw new Error('Report not found');
  }

  if (report.status !== 'resolved') {
    return { success: true, notified: false };
  }

  let reporterId: string | null = null;
  let reporterEmail: string | null = null;
  let reporterName: string | null = null;
  let reporterNickname: string | null = null;
  let reporterAvatarUrl: string | null = null;

  if (report.reporter_id) {
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
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(report.reporter_id);
      reporterEmail = authUser?.user?.email || reporterProfile.email || null;
    }
  } else {
    reporterEmail = report.reporter_email;
    reporterName = report.reporter_name || 'Anonymous User';
  }

  if (!reporterEmail) {
    return { success: true, notified: false, reason: 'No email' };
  }

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

    if (photo?.user_id) {
      entityTitle = photo.title || 'Untitled';
      entityShortId = photo.short_id;
      entityThumbnail = photo.url;
      entityCreatedAt = photo.created_at;
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
      .select('title, cover_image_url, slug, user_id, created_at')
      .eq('id', report.entity_id)
      .single();

    if (album?.user_id) {
      entityTitle = album.title || 'Untitled Album';
      entityThumbnail = album.cover_image_url;
      entityCreatedAt = album.created_at;
      const { data: ownerProfile } = await adminSupabase
        .from('profiles')
        .select('nickname')
        .eq('id', album.user_id)
        .single();
      if (ownerProfile?.nickname && album.slug) {
        entityLink = `/@${ownerProfile.nickname}/album/${album.slug}`;
      }
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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const entityLinkFull = entityLink ? `${baseUrl}${entityLink}` : null;
  let emailSent = false;

  if (reporterEmail && !isTestEmail(reporterEmail)) {
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
      emailSent = true;
    } catch (emailError) {
      console.error('Error sending report resolved email:', emailError);
    }
  }

  return {
    success: true,
    notified: true,
    inAppNotification: !!reporterId,
    emailSent,
  };
}
