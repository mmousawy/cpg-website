/**
 * Download Flickr scrappy camera icons into public/ and seed scrappy_camera_matches from gear_catalog.
 *
 * Usage:
 *   npx tsx scripts/download-scrappy-camera-icons.ts
 *
 * Optional .env.local (for catalog seeding + coverage report):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/database.types';
import { formatCatalogDisplayName } from '../src/lib/gear/formatCatalogDisplayName';
import { gearAliasKey } from '../src/lib/gear/gearAliasKey';
import {
  FLICKR_SCRAPPY_CAMERA_ICON_CDN,
  listScrappyCameraIconFileNames,
  scrappyCameraIconFileName,
} from '../src/lib/gear/scrappyCameraIcon';

config({ path: '.env.local' });

const OUT_DIR = join(process.cwd(), 'public', 'gear', 'scrappy-camera-icons');

async function downloadIcon(fileName: string): Promise<'skipped' | 'downloaded' | 'failed'> {
  const dest = join(OUT_DIR, `${fileName}@2x.png`);
  try {
    const { access } = await import('node:fs/promises');
    await access(dest);
    return 'skipped';
  } catch {
    // not present
  }

  const url = `${FLICKR_SCRAPPY_CAMERA_ICON_CDN}/${fileName}@2x.png`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed ${fileName}: HTTP ${res.status}`);
    return 'failed';
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return 'downloaded';
}

async function seedCatalogMatches(supabase: ReturnType<typeof createClient<Database>>) {
  const { data: rows, error } = await supabase
    .from('gear_catalog')
    .select('brand, name, category')
    .in('category', ['camera_body', 'phone']);

  if (error) {
    console.error('gear_catalog query failed', error);
    return;
  }

  const byFile = new Map<string, number>();
  const upserts: Database['public']['Tables']['scrappy_camera_matches']['Insert'][] = [];

  for (const row of rows ?? []) {
    const displayName = formatCatalogDisplayName(row.brand, row.name);
    const aliasKey = gearAliasKey(displayName);
    if (!aliasKey) continue;

    const fileName = scrappyCameraIconFileName(displayName);
    if (!fileName) continue;

    byFile.set(fileName, (byFile.get(fileName) ?? 0) + 1);
    upserts.push({
      alias_key: aliasKey,
      display_name: displayName,
      file_name: fileName,
    });
  }

  const chunkSize = 500;
  for (let i = 0; i < upserts.length; i += chunkSize) {
    const chunk = upserts.slice(i, i + chunkSize);
    const { error: upsertError } = await supabase
      .from('scrappy_camera_matches')
      .upsert(chunk, { onConflict: 'alias_key' });
    if (upsertError) {
      console.error('scrappy_camera_matches upsert failed', upsertError);
      break;
    }
  }

  console.log('\nCatalog bodies by scrappy file:');
  for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${file}: ${count}`);
  }
  console.log(`\nSeeded ${upserts.length} scrappy_camera_matches rows from gear_catalog.`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const fileNames = listScrappyCameraIconFileNames();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const fileName of fileNames) {
    const result = await downloadIcon(fileName);
    if (result === 'downloaded') downloaded += 1;
    else if (result === 'skipped') skipped += 1;
    else failed += 1;
  }

  console.log(
    `Icons: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed (${fileNames.length} total).`,
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const supabase = createClient<Database>(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await seedCatalogMatches(supabase);
  } else {
    console.log('Skipping catalog seed (set Supabase env vars in .env.local to enable).');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
