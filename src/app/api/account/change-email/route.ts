import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import ChangeEmailTemplate from '@/emails/auth/change-email';
import { render } from '@react-email/render';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY!);

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage (we store hash, send plain token in email)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { newEmail } = await request.json();

    if (!newEmail) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const currentEmail = profile?.email || user.email;

    // Check if trying to change to the same email
    if (currentEmail?.toLowerCase() === newEmail.toLowerCase()) {
      return NextResponse.json(
        { message: 'New email must be different from current email' },
        { status: 400 },
      );
    }

    // Check if new email is already in use (in profiles table)
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', newEmail.toLowerCase())
      .single();

    if (existingProfile && existingProfile.id !== user.id) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 },
      );
    }

    // Also check auth.users for the email
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const emailExistsInAuth = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== user.id,
    );

    if (emailExistsInAuth) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 },
      );
    }

    // Generate verification token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing unused email change tokens for this user
    await adminSupabase
      .from('auth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token_type', 'email_change')
      .is('used_at', null);

    // Store token in database with both current and new email
    const { error: tokenError } = await adminSupabase.from('auth_tokens').insert({
      user_id: user.id,
      email: currentEmail?.toLowerCase() || '', // Current email
      new_email: newEmail.toLowerCase(), // New email
      token_hash: tokenHash,
      token_type: 'email_change',
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      console.error('Error storing token:', tokenError);
      return NextResponse.json(
        { message: 'Failed to initiate email change. Please try again.' },
        { status: 500 },
      );
    }

    // Send confirmation email to the CURRENT (old) email address for security
    const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email-change?token=${token}&email=${encodeURIComponent(newEmail)}`;

    // Skip email in test environment
    const isTestEnv = process.env.RESEND_API_KEY?.startsWith('re_test') ||
                      process.env.NODE_ENV === 'test' ||
                      currentEmail?.endsWith('@test.example.com') ||
                      currentEmail?.endsWith('@test.local');

    if (!isTestEnv && currentEmail) {
      const emailResult = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: currentEmail,
        replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
        subject: 'Confirm your email change - Creative Photography Group',
        html: await render(
          ChangeEmailTemplate({
            fullName: profile?.full_name || undefined,
            newEmail: newEmail,
            verifyLink,
          }),
        ),
      });

      if (emailResult.error) {
        console.error('Email error:', emailResult.error);
        // Don't fail - token was created, but warn about email
        return NextResponse.json(
          {
            success: true,
            message: 'Email change initiated, but there was an issue sending the confirmation email. Please try again later.',
          },
          { status: 200 },
        );
      }
    }

    console.log(`✅ Email change requested: ${currentEmail} → ${newEmail}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Please check your current email for a confirmation link.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Email change error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
