import { createClient } from '@/utils/supabase/server';

export type EmailType = 'events' | 'newsletter' | 'notifications';

/**
 * Check if a user has opted out of a specific email type
 * Falls back to newsletter_opt_in for backward compatibility
 */
export async function hasOptedOut(userId: string, emailType: EmailType): Promise<boolean> {
  const supabase = await createClient();

  try {
    // First check the new email_preferences table (using type assertion for new tables)
    const { data: emailTypeData } = await supabase
      .from('email_types')
      .select('id')
      .eq('type_key', emailType)
      .single();

    if (emailTypeData) {
      const emailTypeId = emailTypeData.id;
      const { data: preference } = await supabase
        .from('email_preferences')
        .select('opted_out')
        .eq('user_id', userId)
        .eq('email_type_id', emailTypeId)
        .single();

      if (preference) {
        return preference.opted_out === true;
      }
    }

    // Fallback: For newsletter type, check newsletter_opt_in for backward compatibility
    if (emailType === 'newsletter') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('newsletter_opt_in')
        .eq('id', userId)
        .single();

      // If newsletter_opt_in is false, they've opted out
      return profile?.newsletter_opt_in === false;
    }

    // Default: not opted out (users are opted in by default)
    return false;
  } catch (error) {
    console.error('Error checking email preferences:', error);
    // On error, default to not opted out (safer to send emails)
    return false;
  }
}

/**
 * Get all email types from the database
 */
export async function getEmailTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_types')
    .select('id, type_key, type_label, description')
    .order('id');

  if (error) {
    console.error('Error fetching email types:', error);
    return [];
  }

  return ((data || []) as unknown) as Array<{ id: number; type_key: string; type_label: string; description: string | null }>;
}

/**
 * Get user's email preferences for all types
 */
export async function getUserEmailPreferences(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('email_preferences')
    .select('opted_out, email_types!inner(id, type_key, type_label)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user email preferences:', error);
    return [];
  }

  return ((data || []) as unknown) as Array<{
    opted_out: boolean;
    email_types: { id: number; type_key: string; type_label: string };
  }>;
}
