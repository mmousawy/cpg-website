import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';
import ActivityContent from './ActivityContent';

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/');
  }

  return <ActivityContent />;
}
