import { isTestEmail, userIdsIncludeTestUser } from '@/lib/auth/isTestEmail';
import { EMAIL_TEMPLATE_KEYS } from '@/lib/email/templateKeys';
import { createNotification } from '@/lib/notifications/create';
import { enqueueDebouncedNotificationEmail } from '@/lib/notifications/emailQueue';
import { adminSupabase } from '@/utils/supabase/admin';

export async function notifyAdminsOfReport(reportId: string): Promise<void> {
  const { data: report, error: reportError } = await adminSupabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    console.error('Error fetching report for notify:', reportError);
    return;
  }

  if (isTestEmail(report.reporter_email) || await userIdsIncludeTestUser(report.reporter_id)) {
    return;
  }

  let reporterName = 'Anonymous User';
  let reporterNickname: string | null = null;
  let reporterAvatarUrl: string | null = null;
  let reporterProfileLink: string | null = null;

  if (report.reporter_id) {
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
    reporterName = report.reporter_name || 'Anonymous User';
  }

  let entityTitle = report.entity_type;
  let entityThumbnail: string | null = null;
  let entityLink: string | null = null;

  if (report.entity_type === 'photo') {
    const { data: photo } = await adminSupabase
      .from('photos')
      .select('title, url, short_id, user_id')
      .eq('id', report.entity_id)
      .single();

    if (photo?.user_id) {
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

    if (album?.user_id) {
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
    entityTitle = 'Comment';
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const reviewLinkRelative = '/admin/reports';
  const reviewLinkFull = `${baseUrl}/admin/reports`;
  const reporterProfileLinkFull = reporterProfileLink ? `${baseUrl}${reporterProfileLink}` : null;
  const entityLinkFull = entityLink ? `${baseUrl}${entityLink}` : null;

  const queueItem = {
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
    isAnonymous: !report.reporter_id,
  };

  const { data: admins, error: adminsError } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_admin', true)
    .is('deletion_scheduled_at', null);

  if (adminsError || !admins?.length) {
    if (adminsError) console.error('Error fetching admins:', adminsError);
    return;
  }

  for (const admin of admins) {
    const { notificationId } = await createNotification({
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
    });

    if (!admin.email || isTestEmail(admin.email)) {
      continue;
    }

    await enqueueDebouncedNotificationEmail({
      recipientUserId: admin.id,
      batchKey: 'admin_reports',
      templateKey: EMAIL_TEMPLATE_KEYS.reportNotification,
      notificationId,
      item: queueItem,
    });
  }
}
