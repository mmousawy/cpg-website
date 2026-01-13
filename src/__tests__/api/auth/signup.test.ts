import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateTestEmail, createTestSupabaseClient, cleanupTestUser, waitForUserCreation, getTestUserByEmail } from '../../utils/test-helpers';

describe('POST /api/auth/signup', () => {
  let testEmail: string;
  let createdUserId: string | null = null;

  beforeEach(() => {
    testEmail = generateTestEmail();
  });

  afterEach(async () => {
    if (createdUserId) {
      await cleanupTestUser(createdUserId);
      createdUserId = null;
    }
  });

  it('should create user successfully with email and password', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'testpassword123',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Wait for user creation (async operation)
    const user = await waitForUserCreation(testEmail);
    expect(user).toBeTruthy();
    createdUserId = user.id;

    // Verify profile creation
    const supabase = createTestSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    expect(profile).toBeTruthy();
    expect(profile.email).toBe(testEmail.toLowerCase());
    expect(profile.nickname).toBeNull();
    expect(profile.full_name).toBeNull();

    // Verify verification token is created
    const { data: tokens } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('token_type', 'email_confirmation');

    expect(tokens).toBeTruthy();
    expect(tokens?.length).toBeGreaterThan(0);
  });

  it('should reject signup with duplicate email', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // Create first user
    const firstResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'testpassword123',
      }),
    });

    expect(firstResponse.status).toBe(200);
    const user = await waitForUserCreation(testEmail);
    createdUserId = user.id;

    // Try to create duplicate
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const duplicateResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'testpassword123',
      }),
    });

    expect(duplicateResponse.status).toBe(400);
    const duplicateData = await duplicateResponse.json();
    expect(duplicateData.message).toContain('already exists');
  });

  it('should reject signup with invalid email format', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'testpassword123',
      }),
    });

    // The API might validate or let Supabase validate
    // Check that it doesn't succeed
    expect(response.status).not.toBe(200);
  });

  it('should reject signup with weak password', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: '12345', // Less than 6 characters
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toContain('at least 6 characters');
  });

  it('should reject signup without required fields', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // Missing email
    const response1 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'testpassword123',
      }),
    });

    expect(response1.status).toBe(400);
    const data1 = await response1.json();
    expect(data1.message).toContain('required');

    // Missing password
    const response2 = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
      }),
    });

    expect(response2.status).toBe(400);
    const data2 = await response2.json();
    expect(data2.message).toContain('required');
  });

  it('should successfully delete test user', async () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // Create user
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'testpassword123',
      }),
    });

    expect(response.status).toBe(200);
    const user = await waitForUserCreation(testEmail);
    createdUserId = user.id;

    // Verify user exists
    const supabase = createTestSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    expect(profile).toBeTruthy();

    // Delete user
    await cleanupTestUser(user.id);
    createdUserId = null; // Prevent double cleanup

    // Verify user is deleted
    const { data: deletedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    expect(deletedProfile).toBeNull();

    // Verify user is deleted from auth
    const deletedUser = await getTestUserByEmail(testEmail);
    expect(deletedUser).toBeUndefined();
  });
});
