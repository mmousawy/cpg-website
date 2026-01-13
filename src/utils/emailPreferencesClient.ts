import { supabase } from '@/utils/supabase/client';

export type EmailType = 'events' | 'newsletter' | 'notifications';

export type EmailTypeData = {
  id: number;
  type_key: string;
  type_label: string;
  description: string | null;
};

export type EmailPreference = {
  email_type_id: number;
  type_key: string;
  type_label: string;
  opted_out: boolean;
};

/**
 * Get all email types from the database
 */
export async function getEmailTypes(): Promise<EmailTypeData[]> {

  const { data, error } = await supabase
    .from('email_types' as any)
    .select('id, type_key, type_label, description')
    .order('id');

  if (error) {
    console.error('Error fetching email types:', error);
    return [];
  }

  return (data || []) as EmailTypeData[];
}

/**
 * Get user's email preferences for all types
 */
export async function getUserEmailPreferences(userId: string): Promise<EmailPreference[]> {

  const { data, error } = await supabase
    .from('email_preferences' as any)
    .select('opted_out, email_types!inner(id, type_key, type_label)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user email preferences:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    email_type_id: item.email_types.id,
    type_key: item.email_types.type_key,
    type_label: item.email_types.type_label,
    opted_out: item.opted_out,
  })) as EmailPreference[];
}

/**
 * Update user's email preferences
 * Batches all preferences into a single upsert operation
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: Array<{ email_type_id: number; opted_out: boolean }>
): Promise<{ error: Error | null }> {

  try {
    // Batch upsert all preferences in a single operation
    const now = new Date().toISOString();
    const upsertData = preferences.map((pref) => ({
      user_id: userId,
      email_type_id: pref.email_type_id,
      opted_out: pref.opted_out,
      updated_at: now,
    }));

    const { error } = await supabase
      .from('email_preferences' as any)
      .upsert(upsertData as any, {
        onConflict: 'user_id,email_type_id',
      });

    if (error) {
      return { error: new Error(`Failed to update email preferences: ${error.message}`) };
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
