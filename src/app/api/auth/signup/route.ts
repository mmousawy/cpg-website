import { checkBotId } from 'botid/server';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { revalidateProfiles } from '@/app/actions/revalidate';
import VerifyEmailTemplate from '@/emails/auth/verify-email';
import { render } from '@react-email/render';
import { createAdminClient } from '@/utils/supabase/admin';

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
    const { email, password, bypassToken } = await request.json();

    const supabase = createAdminClient();
    let shouldSkipBotCheck = false;

    // Check if this is a test email (skip bot check for E2E tests)
    const isTestEmail = email?.endsWith('@test.example.com') || email?.endsWith('@test.local');

    // Validate bypass token if provided (short ID stored directly in token_hash)
    if (bypassToken) {
      const { data: token, error: tokenError } = await supabase
        .from('auth_tokens')
        .select('*')
        .eq('token_hash', bypassToken) // Compare short ID directly
        .eq('token_type', 'signup_bypass')
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !token) {
        return NextResponse.json(
          { message: 'Invalid or expired bypass link' },
          { status: 400 },
        );
      }

      // Mark token as used
      await supabase
        .from('auth_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('id', token.id);

      shouldSkipBotCheck = true;
      console.log('Bypass token validated, skipping BotID check');
    }

    // Check for bots using BotID (skip for test emails and valid bypass tokens)
    // In development, checkBotId() automatically returns { isBot: false }
    if (!isTestEmail && !shouldSkipBotCheck) {
      const { isBot } = await checkBotId();

      if (isBot) {
        console.error('Bot detected for email: ', email, ', rejecting signup attempt');
        return NextResponse.json(
          { message: 'We couldn\'t verify your request. If you\'re having trouble signing up, please email murtada.al.mousawy@gmail.com for assistance.' },
          { status: 403 },
        );
      }
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 },
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );

    if (emailExists) {
      return NextResponse.json(
        { message: 'An account with this email already exists' },
        { status: 400 },
      );
    }

    // Create user with email_confirm set to false
    const { data: userData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // Don't auto-confirm
      });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { message: createError.message || 'Failed to create account' },
        { status: 500 },
      );
    }

    // Generate verification token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    const { error: tokenError } = await supabase.from('auth_tokens').insert({
      user_id: userData.user.id,
      email: email.toLowerCase(),
      token_hash: tokenHash,
      token_type: 'email_confirmation',
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      console.error('Error storing token:', tokenError);
      // Delete the user since we couldn't complete signup
      await supabase.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json(
        { message: 'Failed to create account. Please try again.' },
        { status: 500 },
      );
    }

    // Create profile (only email, nickname and full_name will be null to trigger onboarding)
    // Use upsert in case profile already exists (e.g., from a previous failed signup attempt)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userData.user.id,
      email: email.toLowerCase(),
      full_name: null,
      nickname: null,
    }, {
      onConflict: 'id',
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Non-fatal - profile can be created later
    }

    // Revalidate profiles cache so new member appears in listings
    // Wrapped in try/catch because revalidateTag requires a Next.js request context
    try { await revalidateProfiles(); } catch { /* non-fatal outside request context */ }

    // Send verification email (skip in test environment)
    const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email?token=${token}`;
    const isTestEnv = process.env.RESEND_API_KEY?.startsWith('re_test') ||
                      process.env.NODE_ENV === 'test' ||
                      email.endsWith('@test.example.com') ||
                      email.endsWith('@test.local');

    if (!isTestEnv) {
      const emailResult = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: email,
        replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
        subject: 'Verify your email - Creative Photography Group',
        html: await render(
          VerifyEmailTemplate({
            verifyLink,
          }),
        ),
      });

      if (emailResult.error) {
        console.error('Email error:', emailResult.error);
        // Don't fail the request - user can request a new verification email
      }
    }

    console.log(`✅ User created: ${email} (pending verification)`);

    return NextResponse.json(
      {
        success: true,
        message: 'Account created. Please check your email to verify.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
