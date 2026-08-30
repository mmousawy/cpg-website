import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from '@/database.types';
import type { NextRequest } from 'next/server';

import { isTestApiEnvironmentAllowed, verifyInternalApiRequest } from '@/lib/auth/verifyInternalApi';

type AdminClient = SupabaseClient<Database>;

function buildTestProfileRow({
  userId,
  email,
  nickname,
  fullName,
  completeOnboarding,
  isAdmin = false,
}: {
  userId: string;
  email: string;
  nickname: string;
  fullName: string;
  completeOnboarding: boolean;
  isAdmin?: boolean;
}): TablesInsert<'profiles'> {
  if (completeOnboarding) {
    return {
      id: userId,
      email: email.toLowerCase(),
      nickname,
      full_name: fullName,
      terms_accepted_at: new Date().toISOString(),
      is_admin: isAdmin ? true : undefined,
    };
  }

  return {
    id: userId,
    email: email.toLowerCase(),
    nickname: null,
    full_name: null,
    terms_accepted_at: null,
    avatar_url: null,
    banner_url: null,
    banner_blurhash: null,
  };
}

async function upsertTestProfile(
  adminClient: AdminClient,
  params: {
    userId: string;
    email: string;
    nickname: string;
    fullName: string;
    completeOnboarding: boolean;
    isAdmin?: boolean;
  },
) {
  return adminClient.from('profiles').upsert(buildTestProfileRow(params), {
    onConflict: 'id',
  });
}

/**
 * Test Setup API - Creates a fully verified test user for E2E tests
 * Only works in development or CI with INTERNAL_API_SECRET
 */

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
    const {
      email,
      password,
      nickname,
      fullName,
      completeOnboarding = true,
      asAdmin = false,
    }: {
      email?: string;
      password?: string;
      nickname?: string;
      fullName?: string;
      completeOnboarding?: boolean;
      asAdmin?: boolean;
    } = await request.json();

    // Validate email is a test email (safety check)
    if (!email || (!email.includes('test-e2e-') && !email.includes('@test.local'))) {
      return NextResponse.json(
        { error: 'Only test emails are allowed (must contain test-e2e- or @test.local)' },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 },
      );
    }

    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const testNickname = nickname || `test-${Date.now()}`;
    const testFullName = fullName || 'Test User';
    const shouldCompleteOnboarding = completeOnboarding !== false;

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      const { error: existingProfileError } = await upsertTestProfile(adminClient, {
        userId: existingUser.id,
        email,
        nickname: testNickname,
        fullName: testFullName,
        completeOnboarding: shouldCompleteOnboarding,
        isAdmin: asAdmin,
      });

      if (existingProfileError) {
        return NextResponse.json(
          { error: `Failed to update existing profile: ${existingProfileError.message}` },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        userId: existingUser.id,
        email,
        nickname: testNickname,
        password: password || 'TestPassword123!',
        message: 'User already exists and profile was updated',
      });
    }

    // Create user with email already confirmed
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: password || 'TestPassword123!',
      email_confirm: true, // Auto-confirm for tests
    });

    if (createError) {
      return NextResponse.json(
        { error: `Failed to create user: ${createError.message}` },
        { status: 500 },
      );
    }

    const { error: profileError } = await upsertTestProfile(adminClient, {
      userId: userData.user.id,
      email,
      nickname: testNickname,
      fullName: testFullName,
      completeOnboarding: shouldCompleteOnboarding,
      isAdmin: asAdmin,
    });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Try to clean up the user
      await adminClient.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 },
      );
    }

    console.log(
      `✅ Test user created: ${email} (verified, ${shouldCompleteOnboarding ? 'onboarded' : 'needs onboarding'})`,
    );

    return NextResponse.json({
      success: true,
      userId: userData.user.id,
      email,
      nickname: testNickname,
      password: password || 'TestPassword123!',
    });
  } catch (error) {
    console.error('Test setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
