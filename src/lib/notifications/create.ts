'use server';

import type { Json } from '@/database.types';
import type { CreateNotificationParams } from '@/types/notifications';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Create a notification in the database
 * Uses service role to bypass RLS for server-side creation
 */
export async function createNotification(params: CreateNotificationParams): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        actor_id: params.actorId || null,
        type: params.type,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        data: (params.data || {}) as Json,
      });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('Exception creating notification:', error);
    return { success: false, error: error.message };
  }
}
