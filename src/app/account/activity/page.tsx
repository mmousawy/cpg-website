import { redirect } from 'next/navigation';

import { getAllNotifications, getTotalNotificationsCount } from '@/lib/data/notifications';
import { createClient } from '@/utils/supabase/server';
import ActivityContent from './ActivityContent';

const PAGE_SIZE = 40;

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/');
  }

  const [notifications, totalCount] = await Promise.all([
    getAllNotifications(user.id, PAGE_SIZE),
    getTotalNotificationsCount(user.id),
  ]);

  return <ActivityContent
    initialNotifications={notifications}
    initialTotalCount={totalCount}
  />;
}
