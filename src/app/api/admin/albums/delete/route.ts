import { NextRequest, NextResponse } from 'next/server';
import { revalidateAlbums } from '@/app/actions/revalidate';
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

    // Get album info for logging
    const { data: album } = await supabase
      .from('albums')
      .select('id, title, user_id, slug')
      .eq('id', albumId)
      .single();

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Log the deletion for audit purposes
    console.log('[ADMIN] Album deletion:', {
      albumId: album.id,
      albumTitle: album.title,
      albumSlug: album.slug,
      ownerId: album.user_id,
      deletedBy: user.id,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Use atomic RPC to delete album and all related data
    const { data: success, error: deleteError } = await supabase.rpc('admin_delete_album', {
      p_album_id: albumId,
    });

    if (deleteError || !success) {
      console.error('Error deleting album:', deleteError);
      return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
    }

    // Revalidate album caches
    const { data: owner } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', album.user_id)
      .single();

    if (owner?.nickname) {
      await revalidateAlbums(owner.nickname);
    }

    // TODO: Send notification email to album owner about deletion

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
