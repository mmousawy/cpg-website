import HydrateSession from '@/components/layout/HydrateSession';
import { getServerAuth } from '@/utils/supabase/getServerAuth';

export default async function SessionFromServer() {
  const auth = await getServerAuth();

  return (
    <HydrateSession
      auth={auth}
    />
  );
}
