import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to manually revalidate all cache tags.
 * Protected by a secret token.
 *
 * Usage: GET /api/revalidate-all?secret=YOUR_SECRET
 *
 * Set REVALIDATION_SECRET in your environment variables.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

  // Verify secret token
  if (!process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { error: 'REVALIDATION_SECRET not configured' },
      { status: 500 },
    );
  }

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { error: 'Invalid secret' },
      { status: 401 },
    );
  }

  try {
    // Revalidate all cache tags
    revalidateTag('events', 'max');
    revalidateTag('event-attendees', 'max');
    revalidateTag('albums', 'max');
    revalidateTag('profiles', 'max');

    return NextResponse.json({
      success: true,
      revalidated: ['events', 'event-attendees', 'albums', 'profiles'],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed', details: String(error) },
      { status: 500 },
    );
  }
}
