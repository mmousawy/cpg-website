import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';

type NotifyBody =
  | {
      type: 'shared_album_request_received';
      albumId: string;
      ownerId: string;
    }
  | {
      type: 'shared_album_invite_received';
      albumId: string;
      inviteeId: string;
    }
  | {
      type: 'shared_album_request_accepted' | 'shared_album_request_declined';
      albumId: string;
      userId: string;
    }
  | {
      type: 'shared_album_invite_accepted';
      albumId: string;
      ownerId: string;
      accepterId: string;
    };

export async function verifyAlbumNotifyAuthorization(
  supabase: SupabaseClient<Database>,
  actorId: string,
  body: NotifyBody,
): Promise<boolean> {
  const { data: album } = await supabase
    .from('albums')
    .select('id, user_id, is_shared')
    .eq('id', body.albumId)
    .single();

  if (!album?.is_shared) {
    return false;
  }

  switch (body.type) {
    case 'shared_album_request_received':
      return album.user_id === body.ownerId && actorId !== body.ownerId;

    case 'shared_album_invite_received':
      return album.user_id === actorId && body.inviteeId !== actorId;

    case 'shared_album_request_accepted':
    case 'shared_album_request_declined':
      return album.user_id === actorId && body.userId !== actorId;

    case 'shared_album_invite_accepted':
      return body.accepterId === actorId && album.user_id === body.ownerId;

    default:
      return false;
  }
}
