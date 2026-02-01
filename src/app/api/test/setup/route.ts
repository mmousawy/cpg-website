import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/database.types';

/**
 * Test Setup API - Creates a fully verified test user for E2E tests
 * Only works in development, test, or preview environments
 */

export async function POST(request: Request) {
  // Only allow in development, test, or preview environments
  const isPreview = process.env.VERCEL_ENV === 'preview';
  const isDev = process.env.NODE_ENV !== 'production';
  const isCI = !!process.env.CI;

  if (!isDev && !isCI && !isPreview) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 },
    );
  }

  try {
    const { email, password, nickname, fullName } = await request.json();

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

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // User exists, just return success (allows retrying tests)
      return NextResponse.json({
        success: true,
        userId: existingUser.id,
        email,
        message: 'User already exists',
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

    // Create/update profile with nickname and full_name (completes onboarding)
    const testNickname = nickname || `test-${Date.now()}`;
    const testFullName = fullName || 'Test User';

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userData.user.id,
      email: email.toLowerCase(),
      nickname: testNickname,
      full_name: testFullName,
    }, {
      onConflict: 'id',
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

    console.log(`✅ Test user created: ${email} (verified, onboarded)`);

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
