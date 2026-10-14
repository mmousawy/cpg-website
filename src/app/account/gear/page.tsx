import AccountGearClient from '@/app/account/gear/AccountGearClient';
import { fetchUserGearProfileForUser } from '@/lib/data/gear';
import { createNoIndexMetadata } from '@/utils/metadata';
import { getServerAuth } from '@/utils/supabase/getServerAuth';
import { createClient } from '@/utils/supabase/server';

export const metadata = createNoIndexMetadata({
  title: 'My gear',
  description: 'Manage your shooting preferences and gear inventory',
});

/** Auth + cookies gear load; same as other dynamic account pages (e.g. stats). */
export const instant = false;

export default async function AccountGearPage() {
  const { user, profile } = await getServerAuth();

  if (!user) {
    return (
      <AccountGearClient
        serverSaved={null}
        serverNickname={null}
      />
    );
  }

  const supabase = await createClient();
  const serverSaved = await fetchUserGearProfileForUser(supabase, user.id);

  return (
    <AccountGearClient
      serverSaved={serverSaved}
      serverNickname={profile?.nickname ?? null}
    />
  );
}
