import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { revalidateProfile } from '@/app/actions/revalidate';
import {
  formatNicknameCooldownDate,
  getNicknameCooldownEnd,
  isNicknameChangeOnCooldown,
} from '@/utils/nickname';
import { createAdminClient } from '@/utils/supabase/admin';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=missing_params&message=${encodeURIComponent('Invalid verification link')}`,
    );
  }

  const supabase = createAdminClient();
  const tokenHash = hashToken(token);

  const { data: authToken, error: tokenError } = await supabase
    .from('auth_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('token_type', 'nickname_change')
    .is('used_at', null)
    .single();

  if (tokenError || !authToken) {
    console.error('Nickname change token lookup error:', tokenError);
    return NextResponse.redirect(
      `${origin}/auth-error?error=invalid_token&message=${encodeURIComponent('This verification link is invalid or has already been used')}`,
    );
  }

  if (new Date(authToken.expires_at) < new Date()) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=expired_token&message=${encodeURIComponent('This verification link has expired. Please request a new nickname change.')}`,
    );
  }

  const newNickname = authToken.new_nickname;
  const userId = authToken.user_id;

  if (!newNickname || !userId) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=invalid_data&message=${encodeURIComponent('Invalid token data')}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nickname, nickname_changed_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.nickname) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=invalid_data&message=${encodeURIComponent('Profile not found')}`,
    );
  }

  const oldNickname = profile.nickname;

  if (oldNickname === newNickname) {
    await supabase
      .from('auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', authToken.id);

    return NextResponse.redirect(`${origin}/account?nickname_changed=true`);
  }

  if (isNicknameChangeOnCooldown(profile.nickname_changed_at)) {
    const cooldownEnd = getNicknameCooldownEnd(profile.nickname_changed_at);
    const dateLabel = cooldownEnd
      ? formatNicknameCooldownDate(cooldownEnd)
      : 'later';
    return NextResponse.redirect(
      `${origin}/auth-error?error=update_failed&message=${encodeURIComponent(`Nickname change cooldown active until ${dateLabel}`)}`,
    );
  }

  const { data: isAvailable, error: availabilityError } = await supabase.rpc(
    'is_nickname_available',
    { p_nickname: newNickname, p_user_id: userId },
  );

  if (availabilityError || !isAvailable) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=update_failed&message=${encodeURIComponent('This nickname is no longer available. Please request a new nickname change.')}`,
    );
  }

  await supabase
    .from('auth_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', authToken.id);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ nickname: newNickname })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating nickname:', updateError);
    const message = updateError.message.includes('cooldown')
      ? updateError.message
      : 'Failed to update nickname. Please try again.';
    return NextResponse.redirect(
      `${origin}/auth-error?error=update_failed&message=${encodeURIComponent(message)}`,
    );
  }

  try {
    await Promise.all([
      revalidateProfile(oldNickname),
      revalidateProfile(newNickname),
    ]);
  } catch (revalidateError) {
    console.error('Nickname revalidation error:', revalidateError);
  }

  console.log(`✅ Nickname changed for user ${userId}: @${oldNickname} → @${newNickname}`);

  return NextResponse.redirect(`${origin}/account?nickname_changed=true`);
}
