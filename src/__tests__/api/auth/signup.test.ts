import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateTestEmail, createTestSupabaseClient, cleanupTestUser, getTestUserByEmail } from '../../utils/test-helpers';
import { POST } from '@/app/api/auth/signup/route';
import { NextRequest } from 'next/server';

// Mock resend to prevent actual emails
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    },
  })),
}));

// Helper to create a mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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
    const request = createMockRequest({
      email: testEmail,
      password: 'testpassword123',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify user was created
    const user = await getTestUserByEmail(testEmail);
    expect(user).toBeTruthy();
    createdUserId = user!.id;

    // Verify profile creation
    const supabase = createTestSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single();

    expect(profile).toBeTruthy();
    expect(profile!.email).toBe(testEmail.toLowerCase());
  });

  it('should reject signup with duplicate email', async () => {
    // Create first user
    const firstRequest = createMockRequest({
      email: testEmail,
      password: 'testpassword123',
    });

    const firstResponse = await POST(firstRequest);
    expect(firstResponse.status).toBe(200);

    // Wait for user creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    const user = await getTestUserByEmail(testEmail);
    createdUserId = user!.id;

    // Try to create duplicate
    const duplicateRequest = createMockRequest({
      email: testEmail,
      password: 'testpassword123',
    });

    const duplicateResponse = await POST(duplicateRequest);
    expect(duplicateResponse.status).toBe(400);

    const duplicateData = await duplicateResponse.json();
    expect(duplicateData.message).toContain('already exists');
  });

  it('should reject signup with invalid email format', async () => {
    const request = createMockRequest({
      email: 'invalid-email',
      password: 'testpassword123',
    });

    const response = await POST(request);
    // API returns error status (400 or 500 depending on where validation fails)
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(600);
  });

  it('should reject signup with weak password', async () => {
    const request = createMockRequest({
      email: testEmail,
      password: '12345', // Less than 6 characters
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.message).toContain('at least 6 characters');
  });

  it('should reject signup without required fields', async () => {
    // Missing email
    const request1 = createMockRequest({
      password: 'testpassword123',
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(400);

    const data1 = await response1.json();
    expect(data1.message).toContain('required');

    // Missing password
    const request2 = createMockRequest({
      email: testEmail,
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(400);

    const data2 = await response2.json();
    expect(data2.message).toContain('required');
  });

  it('should successfully delete test user', async () => {
    // Create user
    const request = createMockRequest({
      email: testEmail,
      password: 'testpassword123',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Wait for user creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    const user = await getTestUserByEmail(testEmail);
    expect(user).toBeTruthy();
    createdUserId = user!.id;

    // Verify user exists
    const supabase = createTestSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single();
    expect(profile).toBeTruthy();

    // Delete user
    await cleanupTestUser(user!.id);
    createdUserId = null; // Prevent double cleanup

    // Verify user is deleted
    const { data: deletedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .maybeSingle();
    expect(deletedProfile).toBeNull();

    // Verify user is deleted from auth
    const deletedUser = await getTestUserByEmail(testEmail);
    expect(deletedUser).toBeUndefined();
  });
});
