import { NextRequest, NextResponse } from 'next/server';
import { revalidateAlbum } from '@/app/actions/revalidate';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { albumId, reason } = await request.json();

    if (!albumId || !reason) {
      return NextResponse.json({ error: 'Album ID and reason are required' }, { status: 400 });
    }

    // Suspend the album
    const { error: updateError } = await supabase
      .from('albums')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_by: user.id,
        suspension_reason: reason,
      })
      .eq('id', albumId);

    if (updateError) {
      console.error('Error suspending album:', updateError);
      return NextResponse.json({ error: 'Failed to suspend album' }, { status: 500 });
    }

    // Get album info for revalidation
    const { data: album } = await supabase
      .from('albums')
      .select('slug, user_id')
      .eq('id', albumId)
      .single();

    if (album) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', album.user_id)
        .single();

      if (owner?.nickname) {
        await revalidateAlbum(owner.nickname, album.slug);
      }
    }

    // TODO: Send notification email to album owner

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
