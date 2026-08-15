import { NextRequest, NextResponse } from 'next/server';

import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { getEmailRecipients, isEmailTypeKey } from '@/lib/admin/getEmailRecipients';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

/** GET — list active members with email for admin recipient pickers. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const emailType = request.nextUrl.searchParams.get('emailType') ?? '';
  if (!isEmailTypeKey(emailType)) {
    return NextResponse.json({ message: 'Invalid emailType' }, { status: 400 });
  }

  const eventIdParam = request.nextUrl.searchParams.get('eventId');
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : undefined;
  if (eventIdParam && (Number.isNaN(eventId) || eventId! < 1)) {
    return NextResponse.json({ message: 'Invalid eventId' }, { status: 400 });
  }

  const { recipients, error } = await getEmailRecipients(createAdminClient(), {
    emailType,
    eventId,
  });
  if (error) {
    return NextResponse.json({ message: error }, { status: 500 });
  }

  return NextResponse.json({ recipients });
}
