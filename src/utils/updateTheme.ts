import { createClient } from '@/utils/supabase/client';

/**
 * Update user's theme preference in the database
 * @param userId - The user's ID
 * @param theme - The theme to set ('light', 'dark', 'midnight', or 'system')
 */
export async function updateThemePreference(
  userId: string,
  theme: 'light' | 'dark' | 'midnight' | 'system'
): Promise<{ error: Error | null }> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ theme })
      .eq('id', userId);

    if (error) {
      return { error: new Error(error.message || 'Failed to update theme preference') };
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
