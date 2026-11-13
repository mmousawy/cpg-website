import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isTestApiEnvironmentAllowed, verifyInternalApiRequest } from '@/lib/auth/verifyInternalApi';
import { buildE2eCleanupEmailList, cleanupE2eTestUsers } from '@/lib/test/e2eUserCleanup';
import { createAdminClient } from '@/utils/supabase/admin';

type CleanupBody = {
  emails?: string[];
  sweepOrphans?: boolean;
};

export async function POST(request: NextRequest) {
  const authError = verifyInternalApiRequest(request);
  if (authError) return authError;

  if (!isTestApiEnvironmentAllowed()) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as CleanupBody;
    const { emails, sweepOrphans = false } = body;

    if (!sweepOrphans && (!emails || !Array.isArray(emails) || emails.length === 0)) {
      return NextResponse.json(
        { error: 'emails array is required unless sweepOrphans is true' },
        { status: 400 },
      );
    }

    if (!sweepOrphans && buildE2eCleanupEmailList(emails, []).length === 0) {
      return NextResponse.json(
        { error: 'No valid test emails provided' },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const result = await cleanupE2eTestUsers(adminClient, { emails, sweepOrphans });

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      notFound: result.notFound.length > 0 ? result.notFound : undefined,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
