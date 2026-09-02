import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { getAdminMemberStats } from '@/lib/data/adminStats';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;

    const result = await getAdminMemberStats({
      search: params.get('search') ?? '',
      filter: params.get('filter') ?? 'all',
      sortBy: params.get('sortBy') ?? 'created_at',
      sortOrder: params.get('sortOrder') ?? 'desc',
      page: parseInt(params.get('page') || '1', 10),
      limit: parseInt(params.get('limit') || '50', 10),
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('admin members stats API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
