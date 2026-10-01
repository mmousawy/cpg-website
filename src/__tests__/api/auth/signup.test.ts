/// <reference types="vitest/globals" />
import { POST } from '@/app/api/auth/signup/route';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  upsert: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  isStagingDeployment: vi.fn(() => false),
  revalidateProfiles: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-email-id' }, error: null }),
    };
  },
}));

vi.mock('@/app/actions/revalidate', () => ({
  revalidateProfiles: mocks.revalidateProfiles,
}));

vi.mock('@/utils/siteEnvironment', () => ({
  isStagingDeployment: mocks.isStagingDeployment,
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
      insert: mocks.insert,
      upsert: mocks.upsert,
    }),
    auth: {
      admin: {
        createUser: mocks.createUser,
        deleteUser: mocks.deleteUser,
      },
    },
  }),
}));

function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.example.com`;
}

describe('POST /api/auth/signup', () => {
  let testEmail: string;

  beforeEach(() => {
    testEmail = generateTestEmail();
    vi.clearAllMocks();
    mocks.isStagingDeployment.mockReturnValue(false);
    mocks.revalidateProfiles.mockResolvedValue(undefined);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.createUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mocks.deleteUser.mockResolvedValue({ error: null });
  });

  it('should create user successfully with email and password', async () => {
    const response = await POST(createMockRequest({
      email: testEmail,
      password: 'testpassword123',
    }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: false,
    });
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.upsert).toHaveBeenCalled();
  });

  it('should reject signup with duplicate email', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'existing-user' }, error: null });

    const response = await POST(createMockRequest({
      email: testEmail,
      password: 'testpassword123',
    }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toContain('already exists');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('should reject signup with invalid email format', async () => {
    mocks.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unable to validate email address: invalid format' },
    });

    const response = await POST(createMockRequest({
      email: 'invalid-email',
      password: 'testpassword123',
    }));

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(600);
  });

  it('should reject signup with weak password', async () => {
    const response = await POST(createMockRequest({
      email: testEmail,
      password: '12345',
    }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toContain('at least 6 characters');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('should reject signup without required fields', async () => {
    const missingEmail = await POST(createMockRequest({
      password: 'testpassword123',
    }));
    expect(missingEmail.status).toBe(400);
    expect((await missingEmail.json()).message).toContain('required');

    const missingPassword = await POST(createMockRequest({
      email: testEmail,
    }));
    expect(missingPassword.status).toBe(400);
    expect((await missingPassword.json()).message).toContain('required');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('should require a bypass token on staging', async () => {
    mocks.isStagingDeployment.mockReturnValue(true);

    const response = await POST(createMockRequest({
      email: testEmail,
      password: 'testpassword123',
    }));

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.message).toContain('invite link');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
