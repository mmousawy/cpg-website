import { NextRequest, NextResponse } from 'next/server';
import { revalidateAlbum, revalidateEventAlbum } from '@/app/actions/revalidate';
import { createClient } from '@/utils/supabase/server';
import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await checkIsAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { albumId } = await request.json();

    if (!albumId) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }

    // Unsuspend the album
    const { error: updateError } = await supabase
      .from('albums')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      })
      .eq('id', albumId);

    if (updateError) {
      console.error('Error unsuspending album:', updateError);
      return NextResponse.json({ error: 'Failed to unsuspend album' }, { status: 500 });
    }

    // Get album info for revalidation
    const { data: album } = await supabase
      .from('albums')
      .select('slug, user_id, event_id, event:events!albums_event_id_fkey(slug)')
      .eq('id', albumId)
      .single();

    if (album) {
      const eventSlug = (album.event as { slug?: string | null } | null)?.slug;
      if (album.user_id) {
        const { data: owner } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', album.user_id)
          .single();

        if (owner?.nickname) {
          await revalidateAlbum(owner.nickname, album.slug);
        }
      } else if (album.event_id) {
        await revalidateEventAlbum(album.event_id, eventSlug);
        const { expireTag } = await import('@/lib/cache/expireTag');
        expireTag('albums');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
