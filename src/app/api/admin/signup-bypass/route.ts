import { customAlphabet } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Generate short ID (5 chars, no vowels = URL-friendly)
const generateShortId = customAlphabet('bcdfghjklmnpqrstvwxyz0123456789', 5);

// GET - List all bypass tokens
export async function GET(request: NextRequest) {
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

    // Fetch all bypass tokens
    const adminSupabase = createAdminClient();
    const { data: tokens, error: fetchError } = await adminSupabase
      .from('auth_tokens')
      .select('id, created_at, expires_at, used_at, token_hash')
      .eq('token_type', 'signup_bypass')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching bypass tokens:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch bypass tokens' },
        { status: 500 },
      );
    }

    // Format tokens with status and reconstruct URLs
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const formattedTokens = (tokens || []).map((token) => {
      const now = new Date();
      const expiresAt = new Date(token.expires_at);
      const usedAt = token.used_at ? new Date(token.used_at) : null;

      let status: 'unused' | 'used' | 'expired';
      if (usedAt) {
        status = 'used';
      } else if (expiresAt < now) {
        status = 'expired';
      } else {
        status = 'unused';
      }

      // Reconstruct URL using token_hash (contains the short ID)
      const bypassUrl = token.token_hash
        ? `${siteUrl}/signup?bypass=${token.token_hash}`
        : null;

      return {
        id: token.id,
        createdAt: token.created_at,
        expiresAt: token.expires_at,
        usedAt: token.used_at,
        status,
        bypassUrl,
      };
    });

    return NextResponse.json(
      { tokens: formattedTokens },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error fetching bypass tokens:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
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

    // Generate bypass token (using short ID - clean URLs, sufficient for admin bypass links)
    const token = generateShortId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store token in database (short ID stored directly in token_hash)
    const adminSupabase = createAdminClient();
    const { error: tokenError } = await adminSupabase.from('auth_tokens').insert({
      email: '', // Not tied to a specific email
      token_hash: token, // Store short ID directly
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

// DELETE - Delete a bypass token
export async function DELETE(request: NextRequest) {
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

    // Get token ID from query params
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('id');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 },
      );
    }

    // Delete the token
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase
      .from('auth_tokens')
      .delete()
      .eq('id', tokenId)
      .eq('token_type', 'signup_bypass');

    if (deleteError) {
      console.error('Error deleting bypass token:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete bypass token' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting bypass token:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
