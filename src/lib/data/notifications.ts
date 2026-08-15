import { createClient } from '@/utils/supabase/server';
import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { ADMIN_NOTIFICATION_TYPES_NOT_IN, type NotificationWithActor } from '@/types/notifications';

/**
 * Get unseen notifications count for a user
 * Note: Uses authenticated client for RLS access
 */
export async function getUnseenNotificationsCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('seen_at', null)
    .is('dismissed_at', null);

  if (!isAdmin) {
    query = query.not('type', 'in', ADMIN_NOTIFICATION_TYPES_NOT_IN);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error fetching unseen notifications count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get recent notifications for a user (last 10)
 * Note: Uses authenticated client for RLS access
 */
export async function getRecentNotifications(userId: string, limit = 10): Promise<NotificationWithActor[]> {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);

  let query = supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(nickname, avatar_url, full_name)
    `)
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!isAdmin) {
    query = query.not('type', 'in', ADMIN_NOTIFICATION_TYPES_NOT_IN);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent notifications:', error);
    return [];
  }

  return (data || []).map((notification) => ({
    ...notification,
    actor: notification.actor || null,
  })) as NotificationWithActor[];
}

/**
 * Get total notifications count for a user
 * Note: Uses authenticated client for RLS access
 */
export async function getTotalNotificationsCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('dismissed_at', null);

  if (!isAdmin) {
    query = query.not('type', 'in', ADMIN_NOTIFICATION_TYPES_NOT_IN);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error fetching total notifications count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Get all notifications for a user (for activity page)
 * Note: Uses authenticated client for RLS access
 */
export async function getAllNotifications(userId: string, limit = 50): Promise<NotificationWithActor[]> {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);

  let query = supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(nickname, avatar_url, full_name)
    `)
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!isAdmin) {
    query = query.not('type', 'in', ADMIN_NOTIFICATION_TYPES_NOT_IN);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all notifications:', error);
    return [];
  }

  return (data || []).map((notification) => ({
    ...notification,
    actor: notification.actor || null,
  })) as NotificationWithActor[];
}
