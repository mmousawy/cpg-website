import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';

import ChangeNicknameTemplate from '@/emails/auth/change-nickname';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import {
  formatNicknameCooldownDate,
  getNicknameCooldownEnd,
  isNicknameChangeOnCooldown,
  nicknameSchema,
} from '@/utils/nickname';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY!);

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = nicknameSchema.safeParse(
      typeof body?.nickname === 'string' ? body.nickname.trim().toLowerCase() : '',
    );

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || 'Invalid nickname' },
        { status: 400 },
      );
    }

    const newNickname = parsed.data;

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profileJson, error: profileError } = await supabase.rpc('get_own_profile');
    const profile = (
      profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
        ? profileJson
        : null
    ) as {
      full_name: string | null;
      email: string | null;
      nickname: string | null;
      nickname_changed_at: string | null;
    } | null;

    if (profileError || !profile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json(
        { message: 'Profile not found' },
        { status: 404 },
      );
    }

    const currentNickname = profile.nickname;
    const currentEmail = profile.email || user.email;

    if (!currentNickname) {
      return NextResponse.json(
        { message: 'Complete onboarding before changing your nickname' },
        { status: 400 },
      );
    }

    if (!currentEmail) {
      return NextResponse.json(
        { message: 'No email address on file' },
        { status: 400 },
      );
    }

    if (currentNickname === newNickname) {
      return NextResponse.json(
        { message: 'New nickname must be different from your current nickname' },
        { status: 400 },
      );
    }

    if (isNicknameChangeOnCooldown(profile.nickname_changed_at)) {
      const cooldownEnd = getNicknameCooldownEnd(profile.nickname_changed_at);
      const dateLabel = cooldownEnd
        ? formatNicknameCooldownDate(cooldownEnd)
        : 'later';
      return NextResponse.json(
        { message: `You can change your nickname again on ${dateLabel}` },
        { status: 400 },
      );
    }

    const { data: isAvailable, error: availabilityError } = await adminSupabase.rpc(
      'is_nickname_available',
      { p_nickname: newNickname, p_user_id: user.id },
    );

    if (availabilityError) {
      console.error('Nickname availability error:', availabilityError);
      return NextResponse.json(
        { message: 'Failed to check nickname availability' },
        { status: 500 },
      );
    }

    if (!isAvailable) {
      return NextResponse.json(
        { message: 'This nickname is already taken' },
        { status: 400 },
      );
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await adminSupabase
      .from('auth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token_type', 'nickname_change')
      .is('used_at', null);

    const { error: tokenError } = await adminSupabase.from('auth_tokens').insert({
      user_id: user.id,
      email: currentEmail.toLowerCase(),
      new_nickname: newNickname,
      token_hash: tokenHash,
      token_type: 'nickname_change',
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      console.error('Error storing nickname change token:', tokenError);
      return NextResponse.json(
        { message: 'Failed to initiate nickname change. Please try again.' },
        { status: 500 },
      );
    }

    const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-nickname-change?token=${token}`;

    if (!shouldSkipNotificationsAndEmails(currentEmail)) {
      const emailResult = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
        to: currentEmail,
        replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
        subject: 'Confirm your nickname change - Creative Photography Group',
        html: await render(
          ChangeNicknameTemplate({
            fullName: profile.full_name || undefined,
            currentNickname,
            newNickname,
            verifyLink,
          }),
        ),
      });

      if (emailResult.error) {
        console.error('Nickname change email error:', emailResult.error);
        return NextResponse.json(
          {
            success: true,
            message: 'Nickname change initiated, but there was an issue sending the confirmation email. Please try again later.',
          },
          { status: 200 },
        );
      }
    }

    console.log(`✅ Nickname change requested: @${currentNickname} → @${newNickname}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Please check your email for a confirmation link.',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Nickname change error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
