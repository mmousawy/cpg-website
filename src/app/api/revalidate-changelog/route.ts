import { revalidateChangelog } from '@/app/actions/revalidate';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Revalidate changelog cache after filesystem changelog entries are added or updated.
 *
 * Usage: GET /api/revalidate-changelog?secret=YOUR_SECRET
 *
 * Set REVALIDATION_SECRET in your environment variables.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');

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
    await revalidateChangelog();

    return NextResponse.json({
      success: true,
      revalidated: ['changelog'],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Changelog revalidation error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed', details: String(error) },
      { status: 500 },
    );
  }
}
