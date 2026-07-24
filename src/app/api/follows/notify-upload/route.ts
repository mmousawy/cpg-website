import { notifyFollowersOfPublicPhotos } from '@/lib/follows/notifyUpload';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type NotifyUploadRequest = {
  photoIds: string[];
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: NotifyUploadRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const photoIds = body.photoIds;

  if (!Array.isArray(photoIds) || photoIds.length === 0 || !photoIds.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'photoIds must be a non-empty string array' }, { status: 400 });
  }

  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('id, url, is_public')
    .in('id', photoIds)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (photosError) {
    return NextResponse.json({ error: photosError.message }, { status: 500 });
  }

  const publicPhotos = (photos || []).filter((photo) => photo.is_public);

  if (publicPhotos.length === 0) {
    return NextResponse.json({ success: true, notifiedCount: 0 });
  }

  const { notifiedCount } = await notifyFollowersOfPublicPhotos(
    user.id,
    publicPhotos.map((photo) => ({ id: photo.id, url: photo.url })),
  );

  return NextResponse.json({ success: true, notifiedCount });
}
