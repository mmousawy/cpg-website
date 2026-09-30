import { NextResponse } from 'next/server';

function deployedCommit(): string | null {
  const commit =
    process.env.SOURCE_COMMIT?.trim() ||
    process.env.GIT_COMMIT?.trim() ||
    '';
  return commit || null;
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    commit: deployedCommit(),
  });
}
