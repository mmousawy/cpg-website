import { NextRequest, NextResponse } from 'next/server';

import { validateImageFile } from '@/utils/imageValidation';
import { isSafeUserStoragePath, USER_STORAGE_BUCKETS } from '@/utils/supabaseStorage';
import { createClient } from '@/utils/supabase/server';
import { adminSupabase } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const bucketName = (formData.get('bucket') as string | null) ?? 'user-photos';
    const filePath = formData.get('path') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!filePath || !USER_STORAGE_BUCKETS.has(bucketName)) {
      return NextResponse.json({ error: 'Invalid upload target' }, { status: 400 });
    }

    if (!isSafeUserStoragePath(user.id, filePath)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const validationError = validateImageFile(file, {
      maxSizeBytes: 10 * 1024 * 1024,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });

    if (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    const { error } = await adminSupabase.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
      console.error('Photo storage upload error:', error);
      return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = adminSupabase.storage.from(bucketName).getPublicUrl(filePath);

    return NextResponse.json({ publicUrl });
  } catch (err) {
    console.error('Photo storage upload error:', err);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
