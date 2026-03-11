import { checkBotId } from 'botid/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminSupabase } from '@/utils/supabase/admin';
import { validateImageFile } from '@/utils/imageValidation';

const BUCKET = 'email-assets';
const PREFIX = 'feedback/';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB per screenshot

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const { isBot } = await checkBotId();
      if (isBot) {
        return NextResponse.json(
          { error: "We couldn't verify your request. Please try again." },
          { status: 403 },
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    const validationError = validateImageFile(file, {
      maxSizeBytes: MAX_SIZE,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });

    if (validationError) {
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 },
      );
    }

    const ext = file.name.split('.').pop() || 'png';
    const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : 'png';
    const path = `${PREFIX}${crypto.randomUUID()}.${safeExt}`;

    const { error } = await adminSupabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '31536000', upsert: false });

    if (error) {
      console.error('Feedback screenshot upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload screenshot' },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Feedback screenshot upload error:', err);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 },
    );
  }
}
