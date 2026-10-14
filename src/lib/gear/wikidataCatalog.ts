import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/database.types';
import { upsertCatalogEntry } from '@/lib/gear/catalogDb';
import { formatCatalogDisplayName } from '@/lib/gear/formatCatalogDisplayName';
import type { GearCategory } from '@/lib/gear/types';

const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'CreativePhotographyGroup/1.0 (gear catalog; contact@creativephotography.group)';

type AdminClient = SupabaseClient<Database>;

export type WikidataRow = {
  item: string;
  itemLabel: string;
  brandLabel?: string;
};

type WikidataQuerySpec = {
  id: string;
  category: GearCategory;
  typeQid: string;
  /** Soft cap; paging continues until a short page or this many distinct items. */
  limit: number;
  /** Most gear types need P176; tripods often do not. */
  requireManufacturer?: boolean;
};

/** Verified Wikidata classes (see wikidata.org SPARQL for P31/P176 coverage). */
const WIKIDATA_QUERY_SPECS: WikidataQuerySpec[] = [
  { id: 'camera-model', category: 'camera_body', typeQid: 'Q20888659', limit: 15000 },
  { id: 'digital-camera-model', category: 'camera_body', typeQid: 'Q20741022', limit: 12000 },
  { id: 'lens-model', category: 'lens', typeQid: 'Q109672300', limit: 8000 },
  { id: 'smartphone', category: 'phone', typeQid: 'Q19723451', limit: 5000 },
  { id: 'tripod', category: 'support', typeQid: 'Q683906', limit: 200, requireManufacturer: false },
];

const PAGE_SIZE = 500;
const MAX_QUERY_RETRIES = 5;

const LABEL_BLOCKLIST = [
  /scientific article/i,
  /scholarly article/i,
  /\bpatent\b/i,
  /\bEpisode \d+/i,
  /masters thesis/i,
  /^Commons:/i,
  /\bNAICS\b/i,
  /Reprodução de Documento/i,
  /database report/i,
  /microwave this/i,
];

export function isAcceptableWikidataGearLabel(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    return false;
  }
  return !LABEL_BLOCKLIST.some((re) => re.test(trimmed));
}

export function formatWikidataGearName(brand: string, itemLabel: string): string {
  return formatCatalogDisplayName(brand, itemLabel);
}

/** Build SPARQL for one keyset page (direct P31, ordered by item URI). */
export function buildWikidataSparql(
  typeQid: string,
  pageSize: number,
  requireManufacturer: boolean,
  afterItemUri?: string,
): string {
  const manufacturerClause = requireManufacturer
    ? '?item wdt:P176 ?brand .'
    : 'OPTIONAL { ?item wdt:P176 ?brand . }';
  const keysetFilter = afterItemUri
    ? `FILTER(STR(?item) > "${afterItemUri.replace(/"/g, '\\"')}")`
    : '';
  return `
SELECT DISTINCT ?item ?itemLabel ?brandLabel WHERE {
  ?item wdt:P31 wd:${typeQid} .
  ${manufacturerClause}
  ${keysetFilter}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?item
LIMIT ${pageSize}`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWikidataQuery(query: string): Promise<WikidataRow[]> {
  const url = `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(query)}`;

  for (let attempt = 0; attempt < MAX_QUERY_RETRIES; attempt += 1) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const json = (await res.json()) as {
        results: { bindings: Array<Record<string, { value: string }>> };
      };
      return json.results.bindings.map((b) => ({
        item: b.item?.value ?? '',
        itemLabel: b.itemLabel?.value ?? '',
        brandLabel: b.brandLabel?.value,
      }));
    }

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_QUERY_RETRIES - 1) {
      console.warn('Wikidata query failed', res.status);
      throw new Error(`Wikidata query failed: ${res.status}`);
    }

    const backoffMs = 1000 * 2 ** attempt;
    console.warn(`Wikidata query ${res.status}, retry in ${backoffMs}ms`);
    await sleep(backoffMs);
  }

  return [];
}

async function fetchWikidataTypeRows(spec: WikidataQuerySpec): Promise<WikidataRow[]> {
  const rows: WikidataRow[] = [];
  const seenItems = new Set<string>();
  let afterItemUri: string | undefined;

  while (rows.length < spec.limit) {
    const pageSize = Math.min(PAGE_SIZE, spec.limit - rows.length);
    const batch = await runWikidataQuery(
      buildWikidataSparql(
        spec.typeQid,
        pageSize,
        spec.requireManufacturer !== false,
        afterItemUri,
      ),
    );

    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      if (!row.item || seenItems.has(row.item)) continue;
      seenItems.add(row.item);
      rows.push(row);
    }

    afterItemUri = batch[batch.length - 1]?.item;
    if (!afterItemUri || batch.length < pageSize) {
      break;
    }

    await sleep(350);
  }

  return rows;
}

export async function refreshWikidataCatalog(supabase: AdminClient): Promise<number> {
  let count = 0;

  for (const spec of WIKIDATA_QUERY_SPECS) {
    const rows = await fetchWikidataTypeRows(spec);
    console.info(`Wikidata ${spec.id}: fetched ${rows.length} rows`);

    for (const row of rows) {
      if (!row.itemLabel || !isAcceptableWikidataGearLabel(row.itemLabel)) {
        continue;
      }
      const brand = row.brandLabel?.trim() || '';
      const name = formatWikidataGearName(brand, row.itemLabel);
      const sourceKey = `${spec.id}:${row.item.replace(/^.*\//, '')}`;

      const id = await upsertCatalogEntry(supabase, {
        source: 'wikidata',
        sourceKey,
        category: spec.category,
        brand,
        name,
        aliasStrings: [name, row.itemLabel, brand ? `${brand} ${row.itemLabel}` : row.itemLabel],
      });
      if (id) count += 1;
    }

    await sleep(500);
  }

  return count;
}
