import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Define the expected response type from get_user_stats RPC
interface UserStats {
  albums: number;
  photos: number;
  commentsMade: number;
  commentsReceived: number;
  likesReceived: number;
  likesMade: number;
  viewsReceived: number;
  rsvpsConfirmed: number;
  rsvpsCanceled: number;
  eventsAttended: number;
  memberSince: string | null;
  lastLoggedIn: string | null;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Single RPC call replaces 15+ queries
    const { data: stats, error } = await supabase.rpc('get_user_stats', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error loading stats:', error);
      return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }

    // RPC returns jsonb, cast to our type via unknown
    return NextResponse.json(stats as unknown as UserStats);
  } catch (error) {
    // Don't log prerendering errors (expected during build)
    const isPrerender = error instanceof Error && error.message.includes('prerender');
    if (!isPrerender) {
      console.error('Error loading stats:', error);
    }
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
