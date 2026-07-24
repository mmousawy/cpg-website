import { scheduleNotification } from '@/lib/notifications/schedule';
import type { NotificationType } from '@/types/notifications';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/** Request body for album notification API - aligns with albums/profiles tables */
type NotifyBody =
  | {
      type: 'shared_album_request_received';
      albumId: string;
      albumTitle: string;
      albumSlug: string;
      ownerNickname: string;
      ownerId: string;
    }
  | {
      type: 'shared_album_invite_received';
      albumId: string;
      albumTitle: string;
      albumSlug: string;
      ownerNickname: string;
      inviteeId: string;
    }
  | {
      type: 'shared_album_request_accepted' | 'shared_album_request_declined';
      albumId: string;
      albumTitle: string;
      albumSlug: string;
      ownerNickname: string;
      userId: string;
    }
  | {
      type: 'shared_album_invite_accepted';
      albumId: string;
      albumTitle: string;
      albumSlug: string;
      ownerNickname: string;
      ownerId: string;
      accepterId: string;
    };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as NotifyBody;
    const manageAlbumLink = `/account/albums/${body.albumSlug}`;
    const sharedWithMeLink = body.ownerNickname
      ? `/account/albums/${body.albumSlug}?owner=${body.ownerNickname}`
      : '/account/albums';

    switch (body.type) {
      case 'shared_album_request_received': {
        if (body.ownerId) {
          await scheduleNotification({
            userId: body.ownerId,
            actorId: user.id,
            type: 'shared_album_request_received' as NotificationType,
            entityType: 'album',
            entityId: body.albumId,
            data: {
              title: body.albumTitle,
              link: manageAlbumLink,
              actorNickname: await getActorNickname(user.id),
            },
          });
        }
        break;
      }
      case 'shared_album_invite_received': {
        await scheduleNotification({
          userId: body.inviteeId,
          actorId: user.id,
          type: 'shared_album_invite_received' as NotificationType,
          entityType: 'album',
          entityId: body.albumId,
          data: {
            title: body.albumTitle,
            link: '/account/albums',
            actorNickname: await getActorNickname(user.id),
          },
        });
        break;
      }
      case 'shared_album_request_accepted': {
        await scheduleNotification({
          userId: body.userId,
          actorId: user.id,
          type: body.type as NotificationType,
          entityType: 'album',
          entityId: body.albumId,
          data: {
            title: body.albumTitle,
            link: sharedWithMeLink,
            actorNickname: await getActorNickname(user.id),
          },
        });
        break;
      }
      case 'shared_album_request_declined': {
        await scheduleNotification({
          userId: body.userId,
          actorId: user.id,
          type: body.type as NotificationType,
          entityType: 'album',
          entityId: body.albumId,
          data: {
            title: body.albumTitle,
            link: '/account/albums',
            actorNickname: await getActorNickname(user.id),
          },
        });
        break;
      }
      case 'shared_album_invite_accepted': {
        if (body.ownerId) {
          await scheduleNotification({
            userId: body.ownerId,
            actorId: body.accepterId,
            type: 'shared_album_invite_accepted' as NotificationType,
            entityType: 'album',
            entityId: body.albumId,
            data: {
              title: body.albumTitle,
              link: manageAlbumLink,
              actorNickname: await getActorNickname(body.accepterId),
            },
          });
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Album notify error:', err);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

async function getActorNickname(userId: string): Promise<string | null> {
  const { createPublicClient } = await import('@/utils/supabase/server');
  const supabase = createPublicClient();
  const { data } = await supabase.from('profiles').select('nickname').eq('id', userId).single();
  return data?.nickname ?? null;
}
