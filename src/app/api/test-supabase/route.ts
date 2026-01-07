import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  try {
    const supabase = await createClient();

    // Test 1: Simple query (no auth needed due to RLS policy)
    const start1 = Date.now();
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .limit(1);
    results.tests.simpleQuery = {
      time: Date.now() - start1,
      success: !profileError,
      error: profileError?.message,
      data: profileData,
    };

    // Test 2: Get current session
    const start2 = Date.now();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    results.tests.getSession = {
      time: Date.now() - start2,
      success: !sessionError,
      error: sessionError?.message,
      hasSession: !!session,
      userId: session?.user?.id,
    };

    // Test 3: If we have a session, try to fetch that user's profile
    if (session?.user?.id) {
      const start3 = Date.now();
      const { data: myProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      results.tests.ownProfile = {
        time: Date.now() - start3,
        success: !myProfileError,
        error: myProfileError?.message,
        nickname: myProfile?.nickname,
        isAdmin: myProfile?.is_admin,
      };
    }

    // Test 4: Check Supabase URL being used
    results.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  } catch (err) {
    results.error = err instanceof Error ? err.message : 'Unknown error';
  }

  return NextResponse.json(results);
}
