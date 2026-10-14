/**
 * One-off / local refresh of gear_catalog from Lensfun, Wikidata, Camera-wiki, and curated lists.
 *
 * Usage:
 *   npx tsx scripts/refresh-gear-catalog.ts
 *
 * Requires in .env.local:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Apply gear_catalog migrations first if tables or the camerawiki source enum are missing.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/database.types';
import { refreshGearCatalog } from '../src/lib/gear/refreshGearCatalog';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Refreshing gear catalog (Lensfun + Wikidata + curated)…');
  const started = Date.now();
  const counts = await refreshGearCatalog(supabase, { includeCameraWiki: true });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log('Done in', seconds, 's:', counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
