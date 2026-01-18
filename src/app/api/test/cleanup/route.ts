import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/database.types';

// This endpoint only works in development/test environments
// It cleans up test users created during E2E tests

export async function POST(request: Request) {
  // Only allow in development or test environments
  if (process.env.NODE_ENV === 'production' && !process.env.CI) {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 },
    );
  }

  try {
    const { emails } = await request.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'emails array is required' },
        { status: 400 },
      );
    }

    // Only allow cleanup of test emails (safety check)
    const testEmails = emails.filter((email: string) =>
      email.includes('test-e2e-') ||
      email.includes('@test.local') ||
      email.includes('test-signup-'),
    );

    if (testEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid test emails provided' },
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

    const deleted: string[] = [];
    const errors: string[] = [];

    for (const email of testEmails) {
      // Find user by email
      const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

      if (listError) {
        errors.push(`Failed to list users: ${listError.message}`);
        continue;
      }

      const user = users.users.find(u => u.email === email);

      if (user) {
        // Delete profile first (foreign key constraint)
        await adminClient.from('profiles').delete().eq('id', user.id);

        // Delete auth user
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

        if (deleteError) {
          errors.push(`Failed to delete ${email}: ${deleteError.message}`);
        } else {
          deleted.push(email);
        }
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
