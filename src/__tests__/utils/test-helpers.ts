import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Generate a unique test email address
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@test.example.com`;
}

/**
 * Create admin Supabase client for test operations
 */
export function createTestSupabaseClient() {
  return createAdminClient();
}

type TestUser = {
  id: string;
  email: string;
  [key: string]: unknown;
};

/**
 * Get test user by email
 */
export async function getTestUserByEmail(email: string): Promise<TestUser | undefined> {
  const adminSupabase = createTestSupabaseClient();
  const { data: users } = await adminSupabase.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return undefined;
  return {
    email: user.email || '',
    ...user,
  };
}

/**
 * Cleanup test user from database
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  const adminSupabase = createTestSupabaseClient();

  try {
    // Delete from auth.users (cascades to profiles, auth_tokens, etc.)
    const { error } = await adminSupabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      // Try manual profile deletion as backup
      await adminSupabase.from('profiles').delete().eq('id', userId);
    } else {
      // Also delete profile manually as safety measure (even though CASCADE should handle it)
      await adminSupabase.from('profiles').delete().eq('id', userId);
    }
  } catch (err) {
    console.error(`Error cleaning up test user ${userId}:`, err);
    // Don't throw - cleanup failures shouldn't fail tests
  }
}

/**
 * Wait for user creation (polling helper)
 */
export async function waitForUserCreation(
  email: string,
  maxAttempts = 10,
  delayMs = 500,
): Promise<TestUser> {
  for (let i = 0; i < maxAttempts; i++) {
    const user = await getTestUserByEmail(email);
    if (user) {
      return user;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  throw new Error(`User with email ${email} was not created within ${maxAttempts * delayMs}ms`);
}
