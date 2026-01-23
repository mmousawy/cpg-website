import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';

import { createClient } from '@/utils/supabase/server';
import { CommentNotificationEmail } from '@/emails/comment-notification';
import { encrypt } from '@/utils/encrypt';
import { revalidateAlbum } from '@/app/actions/revalidate';
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
  const { entityType, entityId, commentText } = body;

  if (!entityType || !entityId || !commentText?.trim()) {
    return NextResponse.json(
      { message: 'Entity type, entity ID, and comment text are required' },
      { status: 400 },
    );
  }

  if (entityType !== 'album' && entityType !== 'photo' && entityType !== 'event') {
    return NextResponse.json(
      { message: "Invalid entity type. Must be 'album', 'photo', or 'event'" },
      { status: 400 },
    );
  }

  // Create the comment using the appropriate RPC function
  let commentId: string | null = null;
  let commentError: { message: string } | null = null;

  if (entityType === 'event') {
    // Events use a separate RPC since event_id is INTEGER, not UUID
    const eventIdNum = parseInt(entityId, 10);
    if (isNaN(eventIdNum)) {
      return NextResponse.json(
        { message: 'Invalid event ID' },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('add_event_comment', {
      p_event_id: eventIdNum,
      p_comment_text: commentText.trim(),
    });
    commentId = data ?? null;
    commentError = error;
  } else {
    const { data, error } = await supabase.rpc('add_comment', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_comment_text: commentText.trim(),
    });
    commentId = data ?? null;
    commentError = error;
  }

  if (commentError) {
    console.error('Error creating comment:', commentError);
    return NextResponse.json(
      { message: commentError.message || 'Failed to create comment' },
      { status: 500 },
    );
  }

  // Get commenter info
  const { data: commenterProfile } = await supabase
    .from('profiles')
    .select('full_name, nickname, avatar_url')
    .eq('id', user.id)
    .single();

  const commenterName = commenterProfile?.full_name || user.email?.split('@')[0] || 'Someone';
  const commenterNickname = commenterProfile?.nickname || null;
  const commenterAvatarUrl = commenterProfile?.avatar_url || null;
  const commenterProfileLink = commenterNickname
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/@${commenterNickname}`
    : null;

  // Get owner info and entity details
  let ownerId: string | null = null;
  let entityTitle: string = '';
  let entityLink: string = '';
  let entityThumbnail: string | null = null;
  let ownerProfile: { id: string; email: string | null; full_name: string | null; nickname: string | null } | null = null;

  if (entityType === 'album') {
    const { data: album } = await supabase
      .from('albums')
      .select('id, title, slug, user_id, cover_image_url')
      .eq('id', entityId)
      .single();

    if (album) {
      ownerId = album.user_id;
      entityTitle = album.title;
      entityThumbnail = album.cover_image_url;

      // Get owner profile
      const { data: owner } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname')
        .eq('id', album.user_id)
        .single();

      ownerProfile = owner ? {
        id: owner.id,
        email: owner.email,
        full_name: owner.full_name,
        nickname: owner.nickname,
      } : null;

      // Build album link with comments anchor
      if (ownerProfile?.nickname) {
        entityLink = `${process.env.NEXT_PUBLIC_SITE_URL}/@${ownerProfile.nickname}/album/${album.slug}#comments`;
      }
    }
  } else if (entityType === 'photo') {
    const { data: photo } = await supabase
      .from('photos')
      .select('id, title, short_id, user_id, url')
      .eq('id', entityId)
      .single();

    if (photo && photo.user_id) {
      ownerId = photo.user_id;
      entityTitle = photo.title || 'Untitled photo';
      entityThumbnail = photo.url;

      // Get owner profile
      const { data: owner } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname')
        .eq('id', photo.user_id)
        .single();

      ownerProfile = owner ? {
        id: owner.id,
        email: owner.email,
        full_name: owner.full_name,
        nickname: owner.nickname,
      } : null;

      // Build photo link - need to find which album it's in or use standalone link
      if (ownerProfile?.nickname) {
        // Try to get first album this photo is in
        const { data: albumPhoto } = await supabase
          .from('album_photos')
          .select('albums!inner(slug)')
          .eq('photo_id', photo.id)
          .limit(1)
          .single();

        type AlbumPhotoWithAlbum = {
          albums: { slug: string } | null;
        };

        if (albumPhoto) {
          const typedAlbumPhoto = albumPhoto as AlbumPhotoWithAlbum;
          const album = typedAlbumPhoto.albums;
          if (album) {
            entityLink = `${process.env.NEXT_PUBLIC_SITE_URL}/@${ownerProfile.nickname}/album/${album.slug}/photo/${photo.short_id}#comments`;
          } else {
            entityLink = `${process.env.NEXT_PUBLIC_SITE_URL}/@${ownerProfile.nickname}/photo/${photo.short_id}#comments`;
          }
        } else {
          entityLink = `${process.env.NEXT_PUBLIC_SITE_URL}/@${ownerProfile.nickname}/photo/${photo.short_id}#comments`;
        }
      }
    }
  } else if (entityType === 'event') {
    // For events, we notify all admins instead of a single owner
    const eventIdNum = parseInt(entityId, 10);
    const { data: event } = await supabase
      .from('events')
      .select('id, title, slug, cover_image, image_url')
      .eq('id', eventIdNum)
      .single();

    if (event) {
      entityTitle = event.title || 'Event';
      entityThumbnail = event.cover_image || event.image_url;
      entityLink = `${process.env.NEXT_PUBLIC_SITE_URL}/events/${event.slug}#comments`;

      // Get all admins (excluding the commenter)
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname')
        .eq('is_admin', true)
        .is('suspended_at', null)
        .neq('id', user.id);

      if (admins && admins.length > 0) {
        // Create in-app notifications for all admins
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            actorId: user.id,
            type: 'comment_event',
            entityType: 'event',
            entityId: entityId,
            data: {
              title: entityTitle,
              thumbnail: entityThumbnail,
              link: entityLink,
              actorName: commenterName,
              actorNickname: commenterNickname,
              actorAvatar: commenterAvatarUrl,
            },
          });
        }

        // Check notification preferences and send emails to all admins
        const { data: notificationsEmailType } = await supabase
          .from('email_types')
          .select('id')
          .eq('type_key', 'notifications')
          .single();

        // Batch fetch all admin email preferences at once (instead of N queries in loop)
        let adminPrefsMap = new Map<string, boolean>();
        if (notificationsEmailType) {
          const adminIds = admins.map((a) => a.id);
          const { data: adminPrefs } = await supabase
            .from('email_preferences')
            .select('user_id, opted_out')
            .in('user_id', adminIds)
            .eq('email_type_id', notificationsEmailType.id);

          adminPrefsMap = new Map(
            (adminPrefs || []).map((p) => [p.user_id, p.opted_out]),
          );
        }

        for (const admin of admins) {
          if (!admin.email) continue;

          // Check if this admin has opted out (using pre-fetched map)
          if (adminPrefsMap.get(admin.id) === true) {
            continue;
          }

          // Generate opt-out link for this admin
          let adminOptOutLink: string | undefined;
          try {
            const encrypted = encrypt(JSON.stringify({
              userId: admin.id,
              emailType: 'notifications',
            }));
            adminOptOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
          } catch (error) {
            console.error('Error generating opt-out link:', error);
          }

          // Send notification email to this admin
          const adminName = admin.full_name || admin.email.split('@')[0] || 'Admin';

          try {
            const emailResult = await resend.emails.send({
              from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
              to: admin.email,
              replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
              subject: `${commenterName} commented on the event "${entityTitle}"`,
              html: await render(
                CommentNotificationEmail({
                  ownerName: adminName,
                  commenterName,
                  commenterNickname,
                  commenterAvatarUrl,
                  commenterProfileLink,
                  commentText: commentText.trim(),
                  entityType: 'event',
                  entityTitle,
                  entityThumbnail,
                  entityLink,
                  optOutLink: adminOptOutLink,
                }),
              ),
            });

            if (emailResult.error) {
              console.error(`Error sending event comment notification to ${admin.email}:`, emailResult.error);
            } else {
              console.log(`📨 Event comment notification sent to admin ${admin.email}`);
            }
          } catch (err) {
            console.error(`Error sending event comment notification to ${admin.email}:`, err);
          }
        }
      }

      // Return early for events since we've handled all notifications
      return NextResponse.json({ success: true, commentId }, { status: 200 });
    }
  }

  // Revalidate album page if comment is on an album
  if (entityType === 'album' && ownerProfile?.nickname) {
    const { data: album } = await supabase
      .from('albums')
      .select('slug')
      .eq('id', entityId)
      .single();

    if (album?.slug) {
      await revalidateAlbum(ownerProfile.nickname, album.slug);
    }
  }

  // Create in-app notification for album and photo comments (not events)
  // Skip if commenting on own content
  if (ownerId && ownerId !== user.id && ownerProfile && (entityType === 'album' || entityType === 'photo')) {
    const notificationType = entityType === 'album' ? 'comment_album' : 'comment_photo';

    await createNotification({
      userId: ownerId,
      actorId: user.id,
      type: notificationType,
      entityType,
      entityId,
      data: {
        title: entityTitle,
        thumbnail: entityThumbnail,
        link: entityLink,
        actorName: commenterName,
        actorNickname: commenterNickname,
        actorAvatar: commenterAvatarUrl,
      },
    });
  }

  // Don't send email notification if:
  // 1. Owner not found
  // 2. Owner has no email
  // 3. Commenting on own content
  if (!ownerId || ownerId === user.id || !ownerProfile || !ownerProfile.email) {
    return NextResponse.json({ success: true, commentId }, { status: 200 });
  }

  // Check if owner has opted out of "notifications" email type
  const { data: notificationsEmailType } = await supabase
    .from('email_types')
    .select('id')
    .eq('type_key', 'notifications')
    .single();

  if (notificationsEmailType) {
    const notificationsEmailTypeId = notificationsEmailType.id;
    const { data: preference } = await supabase
      .from('email_preferences')
      .select('opted_out')
      .eq('user_id', ownerId)
      .eq('email_type_id', notificationsEmailTypeId)
      .single();

    // If opted out, don't send email
    if (preference && preference.opted_out === true) {
      return NextResponse.json({ success: true, commentId }, { status: 200 });
    }
  }

  // Generate opt-out link
  let optOutLink: string | undefined;
  try {
    const encrypted = encrypt(JSON.stringify({
      userId: ownerId,
      emailType: 'notifications',
    }));
    optOutLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/${encodeURIComponent(encrypted)}`;
  } catch (error) {
    console.error('Error generating opt-out link:', error);
  }

  // Send notification email
  const ownerName = ownerProfile.full_name || ownerProfile.email.split('@')[0] || 'Friend';

  try {
    const emailResult = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: ownerProfile.email,
      replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
      subject: `${commenterName} commented on your ${entityType === 'album' ? 'album' : 'photo'}`,
      html: await render(
        CommentNotificationEmail({
          ownerName,
          commenterName,
          commenterNickname,
          commenterAvatarUrl,
          commenterProfileLink,
          commentText: commentText.trim(),
          entityType,
          entityTitle,
          entityThumbnail,
          entityLink,
          optOutLink,
        }),
      ),
    });

    if (emailResult.error) {
      console.error('Error sending comment notification email:', emailResult.error);
      // Don't fail the request if email fails - comment is already created
    } else {
      console.log(`📨 Comment notification email sent to ${ownerProfile.email}`);
    }
  } catch (err) {
    console.error('Error sending comment notification email:', err);
    // Don't fail the request if email fails
  }

  return NextResponse.json({ success: true, commentId }, { status: 200 });
}
