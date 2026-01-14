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
      galleries: 0,
      photos: 0,
      commentsMade: 0,
      commentsReceived: 0,
      rsvpsConfirmed: 0,
      rsvpsCanceled: 0,
      eventsAttended: 0,
      galleryViews: 0,
      profileViews: 0,
      lastLoggedIn: null as string | null,
    };

    // Load profile to get last_logged_in
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('last_logged_in')
        .eq('id', user.id)
        .single();

      const data = profileData as { last_logged_in: string | null } | null;
      if (data?.last_logged_in) {
        stats.lastLoggedIn = data.last_logged_in;
      }
    } catch {
      // Profiles table might not exist or last_logged_in column might not exist
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

    // Load galleries count (albums)
    try {
      const { count } = await supabase
        .from('albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count !== null) {
        stats.galleries = count;
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

    // TODO: Comments feature not yet implemented
    // // Load comments made count (when comments table exists)
    // try {
    //   const { count } = await supabase
    //     .from('comments')
    //     .select('*', { count: 'exact', head: true })
    //     .eq('user_id', user.id)

    //   if (count !== null) {
    //     stats.commentsMade = count
    //   }
    // } catch {
    //   // Comments table doesn't exist yet
    // }

    // // Load comments received count (when comments table exists)
    // // This would need to query galleries owned by user and count comments on those galleries
    // try {
    //   const { data: userGalleries } = await supabase
    //     .from('albums')
    //     .select('id')
    //     .eq('user_id', user.id)

    //   if (userGalleries && userGalleries.length > 0) {
    //     const galleryIds = userGalleries.map(g => g.id)
    //     const { count } = await supabase
    //       .from('comments')
    //       .select('*', { count: 'exact', head: true })
    //       .in('gallery_id', galleryIds)

    //     if (count !== null) {
    //       stats.commentsReceived = count
    //     }
    //   }
    // } catch {
    //   // Comments or albums table doesn't exist yet
    // }

    // TODO: Views tracking not yet implemented
    // // Load gallery views (when gallery_views table exists)
    // try {
    //   const { count } = await supabase
    //     .from('gallery_views')
    //     .select('*', { count: 'exact', head: true })
    //     .eq('gallery_owner_id', user.id)

    //   if (count !== null) {
    //     stats.galleryViews = count
    //   }
    // } catch {
    //   // Gallery views table doesn't exist yet
    // }

    // // Load profile views (when profile_views table exists)
    // try {
    //   const { count } = await supabase
    //     .from('profile_views')
    //     .select('*', { count: 'exact', head: true })
    //     .eq('profile_id', user.id)

    //   if (count !== null) {
    //     stats.profileViews = count
    //   }
    // } catch {
    //   // Profile views table doesn't exist yet
    // }

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
