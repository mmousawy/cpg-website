import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    }

    // Load profile to get last_logged_in
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('last_logged_in')
        .eq('id', user.id)
        .single()

      if (profileData?.last_logged_in) {
        stats.lastLoggedIn = profileData.last_logged_in
      }
    } catch {
      // Profiles table might not exist or last_logged_in column might not exist
    }

    // Load RSVP stats
    try {
      const { data: rsvps } = await supabase
        .from('events_rsvps')
        .select('id, confirmed_at, canceled_at')
        .eq('user_id', user.id)

      if (rsvps) {
        stats.rsvpsConfirmed = rsvps.filter(r => r.confirmed_at && !r.canceled_at).length
        stats.rsvpsCanceled = rsvps.filter(r => r.canceled_at).length

        // Try to get attended count separately (in case attended_at column doesn't exist)
        try {
          // Query with attended_at included to check if column exists
          const { data: allRSVPs, error: attendedError } = await supabase
            .from('events_rsvps')
            .select('id, attended_at')
            .eq('user_id', user.id)
          
          if (!attendedError && allRSVPs) {
            // Filter for RSVPs with attended_at set
            stats.eventsAttended = allRSVPs.filter((r: any) => r.attended_at !== null).length
          }
        } catch {
          // attended_at column might not exist yet - that's okay
        }
      }
    } catch {
      // RSVPs table might not exist or have issues - that's okay
    }

    // Load galleries count (when galleries table exists)
    try {
      const { count } = await supabase
        .from('galleries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (count !== null) {
        stats.galleries = count
      }
    } catch {
      // Galleries table doesn't exist yet
    }

    // Load photos count (when photos table exists)
    try {
      const { count } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (count !== null) {
        stats.photos = count
      }
    } catch {
      // Photos table doesn't exist yet
    }

    // Load comments made count (when comments table exists)
    try {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (count !== null) {
        stats.commentsMade = count
      }
    } catch {
      // Comments table doesn't exist yet
    }

    // Load comments received count (when comments table exists)
    // This would need to query galleries owned by user and count comments on those galleries
    try {
      const { data: userGalleries } = await supabase
        .from('galleries')
        .select('id')
        .eq('user_id', user.id)

      if (userGalleries && userGalleries.length > 0) {
        const galleryIds = userGalleries.map(g => g.id)
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('gallery_id', galleryIds)

        if (count !== null) {
          stats.commentsReceived = count
        }
      }
    } catch {
      // Comments or galleries table doesn't exist yet
    }

    // Load gallery views (when gallery_views table exists)
    try {
      const { count } = await supabase
        .from('gallery_views')
        .select('*', { count: 'exact', head: true })
        .eq('gallery_owner_id', user.id)

      if (count !== null) {
        stats.galleryViews = count
      }
    } catch {
      // Gallery views table doesn't exist yet
    }

    // Load profile views (when profile_views table exists)
    try {
      const { count } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', user.id)

      if (count !== null) {
        stats.profileViews = count
      }
    } catch {
      // Profile views table doesn't exist yet
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error loading stats:', error)
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 }
    )
  }
}

