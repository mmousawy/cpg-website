import { NextRequest, NextResponse } from 'next/server';

import {
  revalidateAlbum,
  revalidateGalleryData,
  revalidatePhoto,
  revalidateProfile,
  revalidateTagPhotos,
} from '@/app/actions/revalidate';
import { ingestGearFromPhotoId } from '@/lib/gear/ingestFromExif';
import {
  batchUpdatePhotoDetails,
  type BatchUpdatePhotoDetailsResult,
} from '@/lib/photos/batchUpdatePhotoDetails';
import {
  bodyHasDetailUpdates,
  parseBatchUpdatePhotoDetailsBody,
} from '@/lib/photos/batchUpdatePhotoDetailsSchema';
import { batchUpdatePhotoExif } from '@/lib/photos/batchUpdatePhotoExif';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { sanitizeErrorMessage } from '@/utils/userFacingHttpError';

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

  const parsed = parseBatchUpdatePhotoDetailsBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  try {
    let result: BatchUpdatePhotoDetailsResult = {
      photoIds: parsed.value.photoIds ?? [],
      affectedAlbumSlugs: [],
      affectedTags: [],
      newlyPublicPhotoIds: [],
      visibilityChanged: false,
    };

    if (bodyHasDetailUpdates(parsed.value)) {
      result = await batchUpdatePhotoDetails(supabase, user.id, parsed.value);
    }

    if (parsed.value.exif) {
      const exifResult = await batchUpdatePhotoExif(supabase, user.id, parsed.value.exif);
      result = { ...result, exif: exifResult };

      const admin = createAdminClient();
      for (const row of exifResult.results) {
        if (row.gearChanged) {
          await ingestGearFromPhotoId(admin, row.photoId).catch(() => undefined);
        }
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .maybeSingle();

    const nickname = profile?.nickname ?? null;

    if (nickname) {
      await revalidateProfile(nickname);
      if (result.affectedAlbumSlugs.length > 0) {
        await Promise.all(result.affectedAlbumSlugs.map((slug) => revalidateAlbum(nickname, slug)));
      }
    }

    if (result.affectedTags.length > 0) {
      await Promise.all(result.affectedTags.map((tag) => revalidateTagPhotos(tag)));
    }

    if (result.visibilityChanged) {
      await revalidateGalleryData(nickname);
    }

    if (result.exif?.results.length) {
      const shortIds = [...new Set(result.exif.results.map((row) => row.shortId).filter(Boolean))] as string[];
      await Promise.all(shortIds.map((shortId) => revalidatePhoto(shortId, nickname)));
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('batch photo update error:', error);
    const message = sanitizeErrorMessage(
      error instanceof Error ? error.message : 'Failed to update photos',
    );
    return NextResponse.json({ message }, { status: 500 });
  }
}
