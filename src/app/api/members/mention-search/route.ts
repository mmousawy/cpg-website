import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', results: [] }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get('q') || '').replace(/^@/, '').trim().toLowerCase();
  if (!query || !/^[a-z0-9-]+$/.test(query)) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase.rpc('search_mention_members', {
    p_query: query,
    p_limit: 8,
  });

  if (error) {
    console.error('Mention search failed:', error);
    return NextResponse.json({ error: 'Search failed', results: [] }, { status: 500 });
  }

  return NextResponse.json({
    results: (data ?? []).map((row) => ({
      id: row.id,
      nickname: row.nickname,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      allow_member_tags: true,
    })),
  });
}
