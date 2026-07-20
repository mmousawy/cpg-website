import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  queueCommentNotificationEmail,
  type CommentEmailEntityType,
} from '@/lib/notifications/emailQueue';
import {
  revalidateAlbumBySlug,
  revalidateGalleryData,
  revalidateSceneEvent,
} from '@/app/actions/revalidate';
import { createNotification } from '@/lib/notifications/create';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { commentId, commentText } = body;

  if (!commentId || !commentText?.trim()) {
    return NextResponse.json(
      { message: 'Comment ID and comment text are required' },
      { status: 400 },
    );
  }

  const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select('id, user_id, comment_text')
    .eq('id', commentId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !comment) {
    return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
  }

  if (comment.user_id !== user.id) {
    return NextResponse.json(
      { message: 'You do not have permission to edit this comment' },
      { status: 403 },
    );
  }

  if (comment.comment_text.trim() === commentText.trim()) {
    return NextResponse.json({ success: true, commentId }, { status: 200 });
  }

  const { data, error } = await supabase
    .from('comments')
    .update({
      comment_text: commentText.trim(),
      edited_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ message: 'Failed to update comment' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ message: 'Comment could not be updated' }, { status: 500 });
  }

  return NextResponse.json({ success: true, commentId }, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('id');

  if (!commentId) {
    return NextResponse.json({ message: 'Comment ID is required' }, { status: 400 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  // Get the comment to verify ownership
  const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select('id, user_id')
    .eq('id', commentId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !comment) {
    return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
  }

  // Check permission: must be comment owner or admin
  if (comment.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ message: 'You do not have permission to delete this comment' }, { status: 403 });
  }

  // Use admin client if user is admin (to bypass RLS), otherwise use regular client
  const deleteClient = isAdmin ? createAdminClient() : supabase;

  // Soft delete the comment
  const { data, error } = await deleteClient
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ message: 'Failed to delete comment' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ message: 'Comment could not be deleted' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { entityType, entityId, commentText, parentCommentId } = body;

  if (!entityType || !entityId || !commentText?.trim()) {
    return NextResponse.json(
      { message: 'Entity type, entity ID, and comment text are required' },
      { status: 400 },
    );
  }

  if (
    entityType !== 'album' &&
    entityType !== 'photo' &&
    entityType !== 'event' &&
    entityType !== 'challenge' &&
    entityType !== 'scene_event'
  ) {
    return NextResponse.json(
      {
        message:
          "Invalid entity type. Must be 'album', 'photo', 'event', 'challenge', or 'scene_event'",
      },
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
      p_parent_comment_id: parentCommentId || null,
    });
    commentId = data ?? null;
    commentError = error;
  } else if (entityType === 'challenge') {
    // Challenges use a separate RPC
    const { data, error } = await supabase.rpc('add_challenge_comment', {
      p_challenge_id: entityId,
      p_comment_text: commentText.trim(),
      p_parent_comment_id: parentCommentId || null,
    });
    commentId = data ?? null;
    commentError = error;
  } else if (entityType === 'scene_event') {
    const { data, error } = await supabase.rpc('add_scene_event_comment', {
      p_scene_event_id: entityId,
      p_comment_text: commentText.trim(),
      p_parent_comment_id: parentCommentId || null,
    });
    commentId = data ?? null;
    commentError = error;
  } else {
    const { data, error } = await supabase.rpc('add_comment', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_comment_text: commentText.trim(),
      p_parent_comment_id: parentCommentId || null,
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

  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ success: true, commentId }, { status: 200 });
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

  const queueCommentEmail = async (params: {
    recipientUserId: string;
    entityId: string;
    emailEntityType: CommentEmailEntityType;
    batchEntityType?: string;
    notificationId?: string;
    isReply: boolean;
  }) => {
    if (!commentId) {
      return;
    }

    await queueCommentNotificationEmail({
      recipientUserId: params.recipientUserId,
      entityId: params.entityId,
      notificationId: params.notificationId,
      commentId,
      commenterName,
      commenterNickname,
      commenterAvatarUrl,
      commenterProfileLink,
      commentText,
      entityType: params.emailEntityType,
      entityTitle,
      entityThumbnail,
      entityLink,
      isReply: params.isReply,
      batchEntityType: params.batchEntityType,
    });
  };

  // Handle reply notifications - fetch parent comment author if replying
  let parentCommentAuthorId: string | null = null;
  let parentCommentAuthorProfile: { id: string; email: string | null; full_name: string | null; nickname: string | null } | null = null;
  if (parentCommentId) {
    const { data: parentComment } = await supabase
      .from('comments')
      .select('user_id, profiles!comments_user_id_fkey(id, email, full_name, nickname)')
      .eq('id', parentCommentId)
      .is('deleted_at', null)
      .single();

    if (parentComment) {
      parentCommentAuthorId = parentComment.user_id;
      // Extract profile from the join result
      const profile = (parentComment as any).profiles;
      if (profile) {
        parentCommentAuthorProfile = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          nickname: profile.nickname,
        };
      }
    }
  }

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
      ownerId = album.user_id ?? null;
      entityTitle = album.title;
      entityThumbnail = album.cover_image_url;

      // Get owner profile (skip for event albums with null user_id)
      if (album.user_id) {
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

        // Build album link with comments anchor (relative for notifications)
        if (ownerProfile?.nickname) {
          entityLink = `/@${ownerProfile.nickname}/album/${album.slug}#comments`;
        }
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

      if (ownerProfile?.nickname) {
        entityLink = `/@${ownerProfile.nickname}/photo/${photo.short_id}#comments`;
      }
    }
  } else if (entityType === 'event') {
    // For events, we notify all admins instead of a single owner
    const eventIdNum = parseInt(entityId, 10);
    const { data: event } = await supabase
      .from('events')
      .select('id, title, slug, cover_image')
      .eq('id', eventIdNum)
      .single();

    if (event) {
      entityTitle = event.title || 'Event';
      entityThumbnail = event.cover_image;
      entityLink = `/events/${event.slug}#comments`;

      const notifiedUserIds = new Set<string>([user.id]);

      // Get all admins (excluding the commenter)
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname')
        .eq('is_admin', true)
        .is('suspended_at', null)
        .is('deletion_scheduled_at', null)
        .neq('id', user.id);

      if (admins && admins.length > 0) {
        // Create in-app notifications for all admins
        for (const admin of admins) {
          notifiedUserIds.add(admin.id);
          const notificationResult = await createNotification({
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

          if (admin.email) {
            await queueCommentEmail({
              recipientUserId: admin.id,
              entityId,
              emailEntityType: 'event',
              notificationId: notificationResult.notificationId,
              isReply: false,
            });
          }
        }
      }

      // Notify confirmed RSVPs for top-level comments (not replies)
      if (!parentCommentId) {
        const adminClient = createAdminClient();
        const { data: rsvps, error: rsvpsError } = await adminClient
          .from('events_rsvps')
          .select(`
            user_id,
            email,
            name,
            profiles:profiles!events_rsvps_user_id_profiles_fkey(
              id,
              email,
              full_name,
              suspended_at,
              deletion_scheduled_at
            )
          `)
          .eq('event_id', eventIdNum)
          .not('confirmed_at', 'is', null)
          .is('canceled_at', null);

        if (rsvpsError) {
          console.error('Error fetching RSVPs for comment notifications:', rsvpsError);
        } else if (rsvps && rsvps.length > 0) {
          type RsvpProfile = {
            id: string;
            email: string | null;
            full_name: string | null;
            suspended_at: string | null;
            deletion_scheduled_at: string | null;
          };
          type RsvpRow = {
            user_id: string | null;
            email: string | null;
            name: string | null;
            profiles: RsvpProfile | RsvpProfile[] | null;
          };

          const eligibleRsvps = (rsvps as RsvpRow[]).filter((rsvp) => {
            if (!rsvp.user_id || notifiedUserIds.has(rsvp.user_id)) return false;
            const profile = Array.isArray(rsvp.profiles) ? rsvp.profiles[0] : rsvp.profiles;
            if (profile?.suspended_at || profile?.deletion_scheduled_at) return false;
            return true;
          });

          for (const rsvp of eligibleRsvps) {
            const userId = rsvp.user_id!;
            notifiedUserIds.add(userId);
            const notificationResult = await createNotification({
              userId,
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

            const profile = Array.isArray(rsvp.profiles) ? rsvp.profiles[0] : rsvp.profiles;
            const recipientEmail = profile?.email || rsvp.email;
            if (recipientEmail) {
              await queueCommentEmail({
                recipientUserId: userId,
                entityId,
                emailEntityType: 'event',
                notificationId: notificationResult.notificationId,
                isReply: false,
              });
            }
          }
        }
      }

      // If replying, also notify parent comment author
      if (parentCommentId && parentCommentAuthorId && parentCommentAuthorId !== user.id && parentCommentAuthorProfile) {
        const notificationResult = await createNotification({
          userId: parentCommentAuthorId,
          actorId: user.id,
          type: 'comment_reply',
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

        if (parentCommentAuthorProfile.email) {
          await queueCommentEmail({
            recipientUserId: parentCommentAuthorId,
            entityId,
            emailEntityType: 'event',
            notificationId: notificationResult.notificationId,
            isReply: true,
          });
        }
      }

      // Revalidate event cache so comment count is reflected
      await revalidateGalleryData();

      // Return early for events since we've handled all notifications
      return NextResponse.json({ success: true, commentId }, { status: 200 });
    }
  } else if (entityType === 'challenge') {
    // For challenges, we notify all admins similar to events
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, title, slug, cover_image_url')
      .eq('id', entityId)
      .single();

    if (challenge) {
      entityTitle = challenge.title || 'Challenge';
      entityThumbnail = challenge.cover_image_url;
      entityLink = `/challenges/${challenge.slug}#comments`;

      // Get all admins (excluding the commenter)
      const { data: admins } = await supabase
        .from('profiles')
        .select('id, email, full_name, nickname')
        .eq('is_admin', true)
        .is('suspended_at', null)
        .is('deletion_scheduled_at', null)
        .neq('id', user.id);

      if (admins && admins.length > 0) {
        // Create in-app notifications for all admins
        for (const admin of admins) {
          const notificationResult = await createNotification({
            userId: admin.id,
            actorId: user.id,
            type: 'comment_challenge',
            entityType: 'challenge',
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

          if (admin.email) {
            await queueCommentEmail({
              recipientUserId: admin.id,
              entityId,
              emailEntityType: 'challenge',
              notificationId: notificationResult.notificationId,
              isReply: false,
            });
          }
        }
      }

      // If replying, also notify parent comment author
      if (parentCommentId && parentCommentAuthorId && parentCommentAuthorId !== user.id && parentCommentAuthorProfile) {
        const notificationResult = await createNotification({
          userId: parentCommentAuthorId,
          actorId: user.id,
          type: 'comment_reply',
          entityType: 'challenge',
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

        if (parentCommentAuthorProfile.email) {
          await queueCommentEmail({
            recipientUserId: parentCommentAuthorId,
            entityId,
            emailEntityType: 'challenge',
            notificationId: notificationResult.notificationId,
            isReply: true,
          });
        }
      }

      // Revalidate challenge cache so comment count is reflected
      await revalidateGalleryData();

      // Return early for challenges since we've handled all notifications
      return NextResponse.json({ success: true, commentId }, { status: 200 });
    }
  } else if (entityType === 'scene_event') {
    // Scene events: notify submitter + interested users for top-level comments, parent author for replies
    const { data: sceneEvent } = await supabase
      .from('scene_events')
      .select('id, title, slug, cover_image_url, submitted_by')
      .eq('id', entityId)
      .is('deleted_at', null)
      .single();

    if (sceneEvent) {
      entityTitle = sceneEvent.title || 'Event';
      entityThumbnail = sceneEvent.cover_image_url;
      entityLink = `/scene/${sceneEvent.slug}#comments`;

      const submitterId = sceneEvent.submitted_by;
      const notifiedUserIds = new Set<string>([user.id]);

      // Notify submitter (if not commenting on own event, and not a reply)
      if (
        !parentCommentId &&
        submitterId &&
        submitterId !== user.id
      ) {
        notifiedUserIds.add(submitterId);
        const { data: submitterProfile } = await supabase
          .from('profiles')
          .select('id, email, full_name, nickname')
          .eq('id', submitterId)
          .single();

        const notificationResult = await createNotification({
          userId: submitterId,
          actorId: user.id,
          type: 'comment_scene_event',
          entityType: 'scene_event',
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

        if (submitterProfile?.email) {
          await queueCommentEmail({
            recipientUserId: submitterId,
            entityId,
            emailEntityType: 'event',
            batchEntityType: 'scene_event',
            notificationId: notificationResult.notificationId,
            isReply: false,
          });
        }
      }

      // Notify interested users (top-level comments only, skip already-notified)
      if (!parentCommentId) {
        const { data: interestedUsers } = await supabase
          .from('scene_event_interests')
          .select('user_id')
          .eq('scene_event_id', entityId);

        if (interestedUsers) {
          for (const { user_id: interestedUserId } of interestedUsers) {
            if (notifiedUserIds.has(interestedUserId)) continue;
            notifiedUserIds.add(interestedUserId);

            await createNotification({
              userId: interestedUserId,
              actorId: user.id,
              type: 'comment_scene_event',
              entityType: 'scene_event',
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
        }
      }

      // If replying, notify parent comment author
      if (
        parentCommentId &&
        parentCommentAuthorId &&
        parentCommentAuthorId !== user.id &&
        parentCommentAuthorProfile
      ) {
        const notificationResult = await createNotification({
          userId: parentCommentAuthorId,
          actorId: user.id,
          type: 'comment_reply',
          entityType: 'scene_event',
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

        if (parentCommentAuthorProfile.email) {
          await queueCommentEmail({
            recipientUserId: parentCommentAuthorId,
            entityId,
            emailEntityType: 'event',
            batchEntityType: 'scene_event',
            notificationId: notificationResult.notificationId,
            isReply: true,
          });
        }
      }

      await revalidateSceneEvent(sceneEvent.slug);

      return NextResponse.json({ success: true, commentId }, { status: 200 });
    }
  }

  // Revalidate photo cache if comment is on a photo
  if (entityType === 'photo') {
    await revalidateGalleryData();
  }

  // Revalidate album page if comment is on an album
  if (entityType === 'album' && ownerProfile?.nickname) {
    const { data: album } = await supabase
      .from('albums')
      .select('slug')
      .eq('id', entityId)
      .single();

    if (album?.slug) {
      await revalidateAlbumBySlug(ownerProfile.nickname, album.slug);
    }
  }

  // Handle reply notifications - notify parent comment author
  if (parentCommentId && parentCommentAuthorId && parentCommentAuthorId !== user.id && parentCommentAuthorProfile) {
    const notificationResult = await createNotification({
      userId: parentCommentAuthorId,
      actorId: user.id,
      type: 'comment_reply',
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

    if (parentCommentAuthorProfile.email) {
      await queueCommentEmail({
        recipientUserId: parentCommentAuthorId,
        entityId,
        emailEntityType: entityType as CommentEmailEntityType,
        notificationId: notificationResult.notificationId,
        isReply: true,
      });
    }
  }

  // Create in-app notification for album and photo comments (not events)
  // Skip if commenting on own content or if it's a reply (replies notify parent author instead)
  if (!parentCommentId && ownerId && ownerId !== user.id && ownerProfile && (entityType === 'album' || entityType === 'photo')) {
    const notificationType = entityType === 'album' ? 'comment_album' : 'comment_photo';

    const notificationResult = await createNotification({
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

    if (ownerProfile.email) {
      await queueCommentEmail({
        recipientUserId: ownerId,
        entityId,
        emailEntityType: entityType,
        notificationId: notificationResult.notificationId,
        isReply: false,
      });
    }
  }

  return NextResponse.json({ success: true, commentId }, { status: 200 });
}
