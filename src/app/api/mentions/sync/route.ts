import { NextRequest, NextResponse } from 'next/server';

import { syncContentMentions } from '@/lib/mentions/syncContentMentions';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: { sourceType?: string; sourceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  if (body.sourceType !== 'album' || !body.sourceId) {
    return NextResponse.json({ message: 'Album id is required' }, { status: 400 });
  }

  const { data: album } = await supabase
    .from('albums')
    .select('id, title, slug, description, user_id, cover_image_url')
    .eq('id', body.sourceId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!album || !album.user_id) {
    return NextResponse.json({ message: 'Album not found' }, { status: 404 });
  }

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (album.user_id !== user.id && isAdmin !== true) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { data: owner } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', album.user_id)
    .maybeSingle();

  if (!owner?.nickname) {
    return NextResponse.json({ message: 'Album owner has no nickname' }, { status: 400 });
  }

  await syncContentMentions({
    sourceType: 'album',
    sourceId: album.id,
    text: album.description ?? '',
    actorId: user.id,
    notificationType: 'mention_album',
    entityType: 'album',
    entityId: album.id,
    entityTitle: album.title,
    entityLink: `/@${owner.nickname}/album/${album.slug}`,
    entityThumbnail: album.cover_image_url,
    contextLabel: 'an album description',
  });

  return NextResponse.json({ success: true });
}
