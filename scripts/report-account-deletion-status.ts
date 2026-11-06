/**
 * Live overview of profiles vs account-deletion automation (requires DB access).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local or .env.
 *
 * Usage: pnpm db:report-deletion
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isClearAutomaticSuspensionReason } from '../src/lib/accountDeletion/deletionSource';
import { isEligibleForInactivityDeletion } from '../src/lib/accountDeletion/inactivityEligibility';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

config({ path: path.join(ROOT, '.env.local') });
config({ path: path.join(ROOT, '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local / .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function profilesCountQuery() {
  return supabase.from('profiles').select('*', { count: 'exact', head: true });
}

type ProfilesCountQuery = ReturnType<typeof profilesCountQuery>;

/** Builder runs on the filter chain after `.select` (`.not` only exists there, not on `from()`). */
async function countProfiles(build: (q: ProfilesCountQuery) => ProfilesCountQuery): Promise<number> {
  const { count, error } = await build(profilesCountQuery());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  const now = new Date();

  const totalProfiles = await countProfiles((q) => q);
  const scheduledAny = await countProfiles((q) => q.not('deletion_scheduled_at', 'is', null));

  const [srcSelf, srcAdmin, srcInactivity, srcSuspension] = await Promise.all([
    countProfiles((q) => q.not('deletion_scheduled_at', 'is', null).eq('deletion_source', 'self')),
    countProfiles((q) => q.not('deletion_scheduled_at', 'is', null).eq('deletion_source', 'admin')),
    countProfiles((q) => q.not('deletion_scheduled_at', 'is', null).eq('deletion_source', 'inactivity')),
    countProfiles((q) => q.not('deletion_scheduled_at', 'is', null).eq('deletion_source', 'suspension')),
  ]);

  const scheduledWithSource = srcSelf + srcAdmin + srcInactivity + srcSuspension;
  const srcNull = scheduledAny - scheduledWithSource;

  const suspendedNoSchedule = await countProfiles((q) =>
    q.not('suspended_at', 'is', null).is('deletion_scheduled_at', null),
  );

  const { data: suspendedRows, error: suspErr } = await supabase
    .from('profiles')
    .select('suspended_reason')
    .not('suspended_at', 'is', null)
    .is('deletion_scheduled_at', null);
  if (suspErr) throw new Error(suspErr.message);

  const suspendedClearAuto = (suspendedRows ?? []).filter((r) =>
    isClearAutomaticSuspensionReason(r.suspended_reason),
  ).length;

  const { count: adminCount, error: adminErr } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', true)
    .is('deletion_scheduled_at', null);
  if (adminErr) throw new Error(adminErr.message);
  const adminCountNoSchedule = adminCount ?? 0;

  const pageSize = 1000;
  let offset = 0;
  const candidates: {
    id: string;
    email: string | null;
    created_at: string | null;
    last_logged_in: string | null;
    is_admin: boolean | null;
  }[] = [];

  for (; ;) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, created_at, last_logged_in, is_admin')
      .is('deletion_scheduled_at', null)
      .is('suspended_at', null)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    candidates.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  let inactivityEligible = 0;
  const samples: { id: string; created_at: string | null; last_logged_in: string | null }[] = [];

  for (const p of candidates) {
    if (p.is_admin && adminCountNoSchedule <= 1) continue;
    const ok = isEligibleForInactivityDeletion({
      now,
      createdAt: p.created_at,
      lastLoggedIn: p.last_logged_in,
    });
    if (ok) {
      inactivityEligible += 1;
      if (samples.length < 15) {
        samples.push({
          id: p.id,
          created_at: p.created_at,
          last_logged_in: p.last_logged_in,
        });
      }
    }
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const purgeDue = await countProfiles((q) =>
    q.not('deletion_scheduled_at', 'is', null).lt('deletion_scheduled_at', cutoff.toISOString()),
  );

  console.log('');
  console.log('Account deletion overview (profiles)');
  console.log('=====================================');
  console.log(`Run at: ${now.toISOString()}`);
  console.log('');
  console.log(`Total profiles:                        ${totalProfiles}`);
  console.log(`Scheduled (deletion_scheduled_at set): ${scheduledAny}`);
  console.log(`  pending purge (>30d since schedule): ${purgeDue}  (weekly cleanup cron)`);
  console.log(`  by deletion_source:`);
  console.log(`    self:          ${srcSelf}`);
  console.log(`    admin:         ${srcAdmin}`);
  console.log(`    inactivity:    ${srcInactivity}`);
  console.log(`    suspension:    ${srcSuspension}`);
  console.log(`    null (legacy): ${srcNull}`);
  console.log('');
  console.log(`Suspended, no deletion schedule: ${suspendedNoSchedule}`);
  console.log(`  clear-auto (daily purge):        ${suspendedClearAuto}`);
  console.log(`  other (backfill suspension+30d): ${suspendedNoSchedule - suspendedClearAuto}`);
  console.log('');
  console.log(`Admins with no deletion schedule:  ${adminCountNoSchedule}  (used for last-admin guard)`);
  console.log('');
  console.log(`Inactivity-eligible (today, same rules as daily cron): ${inactivityEligible}`);
  if (samples.length) {
    console.log('  Sample rows (max 15):');
    for (const s of samples) {
      console.log(`    ${s.id}  created=${s.created_at}  last_logged_in=${s.last_logged_in}`);
    }
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
