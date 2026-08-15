import { NextRequest, NextResponse } from 'next/server';

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

    const body = await request.json().catch(() => null) as {
      bucket?: string;
      path?: string;
      paths?: unknown;
    } | null;

    const bucketName = body?.bucket;
    const paths = Array.isArray(body?.paths)
      ? body.paths.filter((path): path is string => typeof path === 'string' && path.length > 0)
      : typeof body?.path === 'string' && body.path
        ? [body.path]
        : [];

    if (!bucketName || paths.length === 0 || !USER_STORAGE_BUCKETS.has(bucketName)) {
      return NextResponse.json({ error: 'Invalid delete target' }, { status: 400 });
    }

    if (paths.some((filePath) => !isSafeUserStoragePath(user.id, filePath))) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const { error } = await adminSupabase.storage.from(bucketName).remove(paths);

    if (error) {
      console.error('Photo storage delete error:', error);
      return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Photo storage delete error:', err);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
