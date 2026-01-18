import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = {
      // Core content stats
      albums: 0,
      photos: 0,
      // Engagement stats
      commentsMade: 0,
      commentsReceived: 0,
      likesReceived: 0,
      likesMade: 0,
      // Event stats
      rsvpsConfirmed: 0,
      rsvpsCanceled: 0,
      eventsAttended: 0,
      // Profile info
      memberSince: null as string | null,
      lastLoggedIn: null as string | null,
    };

    // Load profile to get created_at and last_logged_in
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('created_at, last_logged_in')
        .eq('id', user.id)
        .single();

      const data = profileData as { created_at: string | null; last_logged_in: string | null } | null;
      if (data?.created_at) {
        stats.memberSince = data.created_at;
      }
      if (data?.last_logged_in) {
        stats.lastLoggedIn = data.last_logged_in;
      }
    } catch {
      // Profiles table might not exist or columns might not exist
    }

    // Load RSVP stats
    try {
      const { data: rsvpsData } = await supabase
        .from('events_rsvps')
        .select('id, confirmed_at, canceled_at')
        .eq('user_id', user.id);

      type RSVPData = { id: string; confirmed_at: string | null; canceled_at: string | null }[]
      const rsvps = rsvpsData as RSVPData | null;

      if (rsvps) {
        stats.rsvpsConfirmed = rsvps.filter(r => r.confirmed_at && !r.canceled_at).length;
        stats.rsvpsCanceled = rsvps.filter(r => r.canceled_at).length;

        // Try to get attended count separately (in case attended_at column doesn't exist)
        try {
          // Query with attended_at included to check if column exists
          const { data: allRSVPsData, error: attendedError } = await supabase
            .from('events_rsvps')
            .select('id, attended_at')
            .eq('user_id', user.id);

          const allRSVPs = allRSVPsData as { id: string; attended_at: string | null }[] | null;

          if (!attendedError && allRSVPs) {
            // Filter for RSVPs with attended_at set
            stats.eventsAttended = allRSVPs.filter(r => r.attended_at !== null).length;
          }
        } catch {
          // attended_at column might not exist yet - that's okay
        }
      }
    } catch {
      // RSVPs table might not exist or have issues - that's okay
    }

    // Load albums count
    try {
      const { count } = await supabase
        .from('albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (count !== null) {
        stats.albums = count;
      }
    } catch {
      // Albums table doesn't exist yet
    }

    // Load photos count (using optimized function with subquery)
    try {
      const { data, error } = await supabase
        .rpc('get_user_album_photos_count', { user_uuid: user.id });

      if (!error && data !== null) {
        stats.photos = data;
      }
    } catch {
      // Function might not exist yet, fallback to direct query
      try {
        const { data: albumsData } = await supabase
          .from('albums')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        const albums = albumsData as { id: string }[] | null;

        if (albums && albums.length > 0) {
          const albumIds = albums.map(a => a.id);
          const { count } = await supabase
            .from('album_photos_active')
            .select('*', { count: 'exact', head: true })
            .in('album_id', albumIds);

          if (count !== null) {
            stats.photos = count;
          }
        }
      } catch {
        // Album photos table doesn't exist yet
      }
    }

    // Load comments made by user (comments table has user_id)
    try {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      stats.commentsMade = count || 0;
    } catch {
      // Comments table might not exist yet
    }

    // Load comments received on user's content
    // Need to join through album_comments and photo_comments junction tables
    try {
      // Get user's albums
      const { data: userAlbums } = await supabase
        .from('albums')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      // Get user's photos via album_photos
      const albumIds = userAlbums?.map(a => a.id) || [];
      let photoIds: string[] = [];

      if (albumIds.length > 0) {
        const { data: albumPhotos } = await supabase
          .from('album_photos')
          .select('photo_id')
          .in('album_id', albumIds);

        photoIds = albumPhotos?.map(p => p.photo_id) || [];
      }

      let receivedCount = 0;

      // Get comments on user's albums (excluding own comments)
      if (albumIds.length > 0) {
        const { data: albumCommentLinks } = await supabase
          .from('album_comments')
          .select('comment_id')
          .in('album_id', albumIds);

        if (albumCommentLinks && albumCommentLinks.length > 0) {
          const commentIds = albumCommentLinks.map(c => c.comment_id);
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .in('id', commentIds)
            .neq('user_id', user.id)
            .is('deleted_at', null);

          receivedCount += count || 0;
        }
      }

      // Get comments on user's photos (excluding own comments)
      if (photoIds.length > 0) {
        const { data: photoCommentLinks } = await supabase
          .from('photo_comments')
          .select('comment_id')
          .in('photo_id', photoIds);

        if (photoCommentLinks && photoCommentLinks.length > 0) {
          const commentIds = photoCommentLinks.map(c => c.comment_id);
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .in('id', commentIds)
            .neq('user_id', user.id)
            .is('deleted_at', null);

          receivedCount += count || 0;
        }
      }

      stats.commentsReceived = receivedCount;
    } catch {
      // Comments or content tables might not exist yet
    }

    // Load likes received on user's content
    try {
      // Get user's albums
      const { data: userAlbums } = await supabase
        .from('albums')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      const albumIds = userAlbums?.map(a => a.id) || [];
      let photoIds: string[] = [];

      // Get photos from user's albums
      if (albumIds.length > 0) {
        const { data: albumPhotos } = await supabase
          .from('album_photos')
          .select('photo_id')
          .in('album_id', albumIds);

        photoIds = albumPhotos?.map(p => p.photo_id) || [];
      }

      let receivedLikes = 0;

      // Likes on albums
      if (albumIds.length > 0) {
        const { count } = await supabase
          .from('album_likes')
          .select('*', { count: 'exact', head: true })
          .in('album_id', albumIds);

        receivedLikes += count || 0;
      }

      // Likes on photos
      if (photoIds.length > 0) {
        const { count } = await supabase
          .from('photo_likes')
          .select('*', { count: 'exact', head: true })
          .in('photo_id', photoIds);

        receivedLikes += count || 0;
      }

      stats.likesReceived = receivedLikes;
    } catch {
      // Likes tables might not exist yet
    }

    // Load likes made by user
    try {
      const { count: albumLikes } = await supabase
        .from('album_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: photoLikes } = await supabase
        .from('photo_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      stats.likesMade = (albumLikes || 0) + (photoLikes || 0);
    } catch {
      // Likes tables might not exist yet
    }

    return NextResponse.json(stats);
  } catch (error) {
    // Don't log prerendering errors (expected during build)
    const isPrerender = error instanceof Error && error.message.includes('prerender');
    if (!isPrerender) {
      console.error('Error loading stats:', error);
    }
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 },
    );
  }
}
