import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

    // Delete album photos first (cascade should handle this, but being explicit)
    await supabase
      .from('album_photos')
      .delete()
      .eq('album_id', albumId);

    // Delete album tags
    await supabase
      .from('album_tags')
      .delete()
      .eq('album_id', albumId);

    // Delete album comments (get comment IDs first, then delete from comments table)
    const { data: albumCommentLinks } = await supabase
      .from('album_comments')
      .select('comment_id')
      .eq('album_id', albumId);

    if (albumCommentLinks && albumCommentLinks.length > 0) {
      const commentIds = albumCommentLinks.map(ac => ac.comment_id);
      await supabase
        .from('comments')
        .delete()
        .in('id', commentIds);
    }

    // Delete the album
    const { error: deleteError } = await supabase
      .from('albums')
      .delete()
      .eq('id', albumId);

    if (deleteError) {
      console.error('Error deleting album:', deleteError);
      return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
    }

    // Revalidate album pages
    // Get owner nickname for path revalidation
    const { data: owner } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', album.user_id)
      .single();

    if (owner?.nickname) {
      revalidatePath(`/@${owner.nickname}/album/${album.slug}`);
      revalidatePath(`/@${owner.nickname}`);
    }
    revalidatePath('/galleries');
    revalidatePath('/');

    // TODO: Send notification email to album owner about deletion

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
