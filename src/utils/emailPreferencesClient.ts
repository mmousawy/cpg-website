import { supabase } from '@/utils/supabase/client';

export type EmailType = 'events' | 'newsletter' | 'notifications' | 'weekly_digest';

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
 * Email preference types (from email_types table).
 * Users can opt in/out per type in Account → Preferences.
 *
 * | type_key           | What it controls |
 * |--------------------|------------------|
 * | events             | Event announcements, RSVP reminders (5 days before for non-RSVPs) |
 * | notifications      | Comment notifications (photos, albums, replies) |
 * | photo_challenges   | Challenge announcements, submission results |
 * | challenge_comment  | Comments on challenges you participated in |
 * | weekly_digest      | Weekly activity summary |
 * | newsletter         | General announcements |
 * | admin_notifications| Admin-only (filtered from user UI) |
 */
export const EMAIL_TYPE_OVERVIEW = {
  events: 'Event announcements and RSVP reminders',
  notifications: 'Comment and activity notifications',
  photo_challenges: 'Challenge announcements and results',
  challenge_comment: 'Comments on challenges you joined',
  weekly_digest: 'Weekly activity digest',
  newsletter: 'General announcements',
  admin_notifications: 'Admin-only (internal)',
} as const;

/**
 * Get all email types from the database
 */
export async function getEmailTypes(): Promise<EmailTypeData[]> {

  const { data, error } = await supabase
    .from('email_types')
    .select('id, type_key, type_label, description')
    .order('id');

  if (error) {
    console.error('Error fetching email types:', error);
    return [];
  }

  return (data || []) as unknown as EmailTypeData[];
}

/**
 * Get user's email preferences for all types
 */
export async function getUserEmailPreferences(userId: string): Promise<EmailPreference[]> {

  const { data, error } = await supabase
    .from('email_preferences')
    .select('opted_out, email_types!inner(id, type_key, type_label)')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user email preferences:', error);
    return [];
  }

  return (data || []).map((item: { email_types: { id: number; type_key: string; type_label: string }; opted_out: boolean }) => ({
    email_type_id: item.email_types.id,
    type_key: item.email_types.type_key,
    type_label: item.email_types.type_label,
    opted_out: item.opted_out,
  }));
}

/**
 * Update user's email preferences
 * Batches all preferences into a single upsert operation
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: Array<{ email_type_id: number; opted_out: boolean }>,
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
      .from('email_preferences')
      .upsert(upsertData, {
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
