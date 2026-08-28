import { getPostLoginRedirect } from '@/utils/postLoginRedirect';
import { loadBrowserSupabase } from '@/utils/supabase/loadBrowserClient';

import type { Profile } from '@/context/AuthContext';

export async function signOutWithSupabase() {
  const supabase = await loadBrowserSupabase();
  await supabase.auth.signOut();
}

export async function signInWithGoogle(redirectTo?: string) {
  const supabase = await loadBrowserSupabase();
  const safePath = redirectTo ? getPostLoginRedirect(redirectTo) : null;
  const query = safePath ? `?redirectTo=${encodeURIComponent(safePath)}` : '';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth-callback${query}` },
  });
  return { error };
}

export async function signInWithDiscord(redirectTo?: string) {
  const supabase = await loadBrowserSupabase();
  const safePath = redirectTo ? getPostLoginRedirect(redirectTo) : null;
  const query = safePath ? `?redirectTo=${encodeURIComponent(safePath)}` : '';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo: `${window.location.origin}/auth-callback${query}` },
  });
  return { error };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = await loadBrowserSupabase();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error };

  if (data.user) {
    const { data: profileData, error: profileError } = await supabase.rpc('get_own_profile');
    const profile = profileError ? null : profileData as Profile | null;

    if (profile?.deletion_scheduled_at) {
      await supabase.auth.signOut();
      return { error: new Error('This account is scheduled for deletion. If you want to cancel the deletion, please contact us through the contact form.') };
    }

    if (profile?.suspended_at) {
      await supabase.auth.signOut();
      return { error: new Error('This account has been suspended. Please contact us if you believe this is an error.') };
    }
  }

  return { error: null };
}

export async function signUpWithEmail(email: string, password: string, bypassToken?: string) {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        ...(bypassToken && { bypassToken }),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as { message?: string };
      return { error: new Error(errorData.message || 'Failed to create account') };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
  }
}

export async function resetPassword(email: string) {
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as { message?: string };
      return { error: new Error(errorData.message || 'Failed to send reset email') };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('An unexpected error occurred') };
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = await loadBrowserSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error || null };
}

export async function updateProfileThemeInDb(
  userId: string,
  theme: 'light' | 'dark' | 'midnight' | 'system',
) {
  const supabase = await loadBrowserSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ theme })
    .eq('id', userId);

  if (error) {
    return { error: new Error(error.message || 'Failed to update theme preference') };
  }

  return { error: null };
}
