import { searchPlaces } from '@/lib/location/searchPlaces';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchPlaces(q, 8);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Location search failed' }, { status: 502 });
  }
}
