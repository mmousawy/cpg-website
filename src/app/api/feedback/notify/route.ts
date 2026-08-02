import { NextResponse } from 'next/server';

/** Deprecated — notifications are sent inline from POST /api/feedback. */
export async function POST() {
  return NextResponse.json({ message: 'Not found' }, { status: 404 });
}
