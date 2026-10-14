import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { upsertCatalogEntry } from '@/lib/gear/catalogDb';
import { CURATED_GEAR } from '@/lib/gear/curatedPhones';
import { formatCatalogDisplayName } from '@/lib/gear/formatCatalogDisplayName';
import { parseLensfunXml } from '@/lib/gear/parseLensfunXml';
import { refreshCameraWikiCatalog } from '@/lib/gear/camerawikiCatalog';
import { refreshWikidataCatalog } from '@/lib/gear/wikidataCatalog';

const LENSFUN_DB_API =
  'https://api.github.com/repos/lensfun/lensfun/contents/data/db?ref=master';
const LENSFUN_RAW_BASE =
  'https://raw.githubusercontent.com/lensfun/lensfun/master/data/db/';

type AdminClient = SupabaseClient<Database>;

async function fetchLensfunFileList(): Promise<string[]> {
  const res = await fetch(LENSFUN_DB_API, {
    headers: { Accept: 'application/vnd.github+json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Lensfun file list failed: ${res.status}`);
  }
  const json = (await res.json()) as Array<{ name: string; download_url: string }>;
  return json.filter((f) => f.name.endsWith('.xml')).map((f) => f.name);
}

async function refreshLensfun(supabase: AdminClient): Promise<number> {
  const files = await fetchLensfunFileList();
  let count = 0;

  for (const fileName of files) {
    const res = await fetch(`${LENSFUN_RAW_BASE}${fileName}`, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.warn(`Skipping lensfun file ${fileName}: ${res.status}`);
      continue;
    }
    const xml = await res.text();
    const entries = parseLensfunXml(xml, fileName);
    for (const entry of entries) {
      const id = await upsertCatalogEntry(supabase, entry);
      if (id) count += 1;
    }
  }

  return count;
}

async function refreshCurated(supabase: AdminClient): Promise<number> {
  let count = 0;
  for (const entry of CURATED_GEAR) {
    const displayName = formatCatalogDisplayName(entry.brand, entry.name);
    const id = await upsertCatalogEntry(supabase, {
      source: 'curated',
      sourceKey: entry.sourceKey,
      category: entry.category,
      brand: entry.brand,
      name: displayName,
      aliasStrings: [entry.name, displayName],
    });
    if (id) count += 1;
  }
  return count;
}

export type RefreshGearCatalogOptions = {
  /** Camera-wiki crawl is slow; enabled for local script, off for Vercel cron. */
  includeCameraWiki?: boolean;
};

export async function refreshGearCatalog(
  supabase: AdminClient,
  options: RefreshGearCatalogOptions = {},
): Promise<{
  lensfun: number;
  wikidata: number;
  curated: number;
  camerawiki: number;
}> {
  const curated = await refreshCurated(supabase);
  let lensfun = 0;
  let wikidata = 0;
  let camerawiki = 0;
  try {
    lensfun = await refreshLensfun(supabase);
  } catch (err) {
    console.error('Lensfun refresh failed', err);
  }
  try {
    wikidata = await refreshWikidataCatalog(supabase);
  } catch (err) {
    console.error('Wikidata refresh failed', err);
  }
  if (options.includeCameraWiki) {
    try {
      camerawiki = await refreshCameraWikiCatalog(supabase);
    } catch (err) {
      console.error('Camera-wiki refresh failed', err);
    }
  }
  return { lensfun, wikidata, curated, camerawiki };
}
