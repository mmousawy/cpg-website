import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  revalidateAlbum,
  revalidateAlbumBySlug,
  revalidateEventAlbum,
} from '@/app/actions/revalidate';
import { batchUpdateAlbumPhotos } from '@/lib/photos/batchUpdateAlbumPhotos';
import { createClient } from '@/utils/supabase/server';
import { sanitizeErrorMessage } from '@/utils/userFacingHttpError';

const bodySchema = z.object({
  albumId: z.string().uuid().optional(),
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().nonnegative().optional(),
        title: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request body';
    return NextResponse.json({ message }, { status: 400 });
  }

  try {
    await batchUpdateAlbumPhotos(supabase, parsed.data.updates);

    const albumId = parsed.data.albumId
      ?? (await supabase
        .from('album_photos')
        .select('album_id')
        .eq('id', parsed.data.updates[0]!.id)
        .maybeSingle()).data?.album_id;

    if (albumId) {
      const { data: album } = await supabase
        .from('albums')
        .select('slug, event_id')
        .eq('id', albumId)
        .maybeSingle();

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .maybeSingle();

      const nickname = profile?.nickname ?? null;

      if (album?.event_id) {
        const { data: event } = await supabase
          .from('events')
          .select('slug')
          .eq('id', album.event_id)
          .maybeSingle();
        if (event?.slug) {
          await revalidateEventAlbum(album.event_id, event.slug);
        }
      } else if (nickname && album?.slug) {
        await revalidateAlbumBySlug(nickname, album.slug);
        await revalidateAlbum(nickname, album.slug);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('album photo batch update error:', error);
    const message = sanitizeErrorMessage(
      error instanceof Error ? error.message : 'Failed to update album photos',
    );
    return NextResponse.json({ message }, { status: 500 });
  }
}
