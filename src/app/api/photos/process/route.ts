import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { formatCopyrightNotice } from '@/utils/licenses';
import type { WatermarkStyle } from '@/lib/watermark';
import { NextRequest, NextResponse } from 'next/server';

const BUCKET = 'user-photos';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { photoId } = body;

    if (!photoId || typeof photoId !== 'string') {
      return NextResponse.json({ error: 'Missing photoId' }, { status: 400 });
    }

    // Fetch photo and verify ownership
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, storage_path, user_id, license')
      .eq('id', photoId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Fetch user profile for processing options
    const { data: profile } = await supabase
      .from('profiles')
      .select('watermark_enabled, watermark_style, watermark_text, embed_copyright_exif, exif_copyright_text, copyright_name, full_name')
      .eq('id', user.id)
      .single();

    const watermarkEnabled = profile?.watermark_enabled ?? false;
    const embedExif = profile?.embed_copyright_exif ?? false;

    if (!watermarkEnabled && !embedExif) {
      return NextResponse.json({ success: true, processed: false });
    }

    // Download original from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(photo.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to download photo' },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mimeType = fileData.type || 'image/jpeg';
    const isJpeg = mimeType === 'image/jpeg';

    const copyrightName = profile?.copyright_name || profile?.full_name || 'Unknown';
    const year = new Date().getFullYear();
    const autoCopyrightNotice = formatCopyrightNotice(
      copyrightName,
      year,
      photo.license || 'all-rights-reserved',
    );
    const copyrightNotice = profile?.exif_copyright_text || autoCopyrightNotice;

    let processedBuffer: Buffer = Buffer.from(buffer);

    // 1. Embed EXIF copyright (JPEG only, only if missing)
    if (embedExif && isJpeg) {
      const exifModule = await import('@/lib/exifWriter');
      processedBuffer = exifModule.embedCopyrightExif(
        processedBuffer,
        copyrightNotice,
        copyrightName,
        true,
      );
    }

    // 2. Apply watermark
    if (watermarkEnabled) {
      const watermarkModule = await import('@/lib/watermark');
      const style = (profile?.watermark_style as WatermarkStyle) || 'text';
      const watermarkText = profile?.watermark_text || `\u00a9 ${copyrightName}`;
      processedBuffer = await watermarkModule.applyWatermark(
        processedBuffer,
        watermarkText,
        style,
      );
    }

    // Overwrite the original file with processed version (admin client bypasses RLS)
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .update(photo.storage_path, processedBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload processed photo', detail: uploadError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (err) {
    console.error('Photo process error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
