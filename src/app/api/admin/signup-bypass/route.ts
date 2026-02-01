import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage (we store hash, send plain token in URL)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// POST - Generate a new bypass token
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate bypass token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store token in database
    const adminSupabase = createAdminClient();
    const { error: tokenError } = await adminSupabase.from('auth_tokens').insert({
      email: '', // Not tied to a specific email
      token_hash: tokenHash,
      token_type: 'signup_bypass',
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      console.error('Error storing bypass token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate bypass link' },
        { status: 500 },
      );
    }

    // Generate the full signup URL with bypass token
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const bypassUrl = `${siteUrl}/signup?bypass=${token}`;

    return NextResponse.json(
      {
        success: true,
        bypassUrl,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error generating bypass token:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
