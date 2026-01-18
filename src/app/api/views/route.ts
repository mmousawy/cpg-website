import { createPublicClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * View Tracking API
 *
 * Tracks views on photos and albums by incrementing view_count in the database.
 *
 * Caching Strategy:
 * - View counts are intentionally NOT invalidated on each view for performance
 * - View counts will be slightly stale (acceptable for non-critical metrics)
 * - "Most viewed this week" queries use 1-hour cache for freshness
 * - Detail pages use max cache - view counts update on next cache invalidation
 * - Account/profile stats use max cache - acceptable to be slightly stale
 *
 * This approach balances performance (no cache invalidation overhead) with
 * acceptable freshness (view counts don't need to be real-time).
 */

// Bot detection patterns (case-insensitive)
const BOT_PATTERNS = [
  'bot',
  'crawl',
  'spider',
  'slurp',
  'mediapartners',
  'googlebot',
  'bingbot',
  'yandex',
  'baidu',
  'duckduck',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'embedly',
  'quora',
  'pinterest',
  'redditbot',
  'slackbot',
  'whatsapp',
  'telegram',
  'discordbot',
  'applebot',
  'msnbot',
  'ia_archiver',
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}

export async function POST(request: NextRequest) {
  try {
    // Check User-Agent for bots
    const userAgent = request.headers.get('user-agent');
    if (isBot(userAgent)) {
      // Silently ignore bot requests
      return NextResponse.json({ ok: true, skipped: 'bot' }, { status: 200 });
    }

    const body = await request.json();
    const { type, id } = body;

    // Validate input
    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 },
      );
    }

    if (type !== 'photo' && type !== 'album') {
      return NextResponse.json(
        { error: "Type must be 'photo' or 'album'" },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    // Use public client (no auth needed for view tracking)
    const supabase = createPublicClient();

    // Call RPC function to atomically increment view count
    const { error } = await supabase.rpc('increment_view_count', {
      p_entity_type: type,
      p_entity_id: id,
    });

    if (error) {
      console.error('Error incrementing view count:', error);
      // Don't fail the request - view tracking is non-critical
      return NextResponse.json({ ok: true, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Error in views API:', error);
    // Don't fail the request - view tracking is non-critical
    return NextResponse.json(
      { ok: true, error: 'Internal server error' },
      { status: 200 },
    );
  }
}
