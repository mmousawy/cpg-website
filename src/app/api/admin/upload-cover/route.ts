import { NextRequest, NextResponse } from 'next/server';

import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { validateImageFile } from '@/utils/imageValidation';
import { safeFileExtension } from '@/utils/security';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

const BUCKET = 'event-covers';
const ALLOWED_FOLDERS = new Set(['events', 'challenges']);

/** POST — upload an event or challenge cover image (admin only, service role) */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (typeof folder !== 'string' || !ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 });
    }

    const validationError = validateImageFile(file, {
      maxSizeBytes: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });

    if (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    const ext = safeFileExtension(file.name);
    const filePath = `${folder}/${crypto.randomUUID()}.${ext}`;
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase.storage
      .from(BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Cover storage upload error:', error);
      return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = adminSupabase.storage.from(BUCKET).getPublicUrl(filePath);

    return NextResponse.json({ publicUrl, filePath });
  } catch (err) {
    console.error('Cover storage upload error:', err);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
