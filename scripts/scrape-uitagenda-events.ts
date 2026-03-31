/**
 * Scrape photography events from Uitagenda Rotterdam API and insert into scene_events.
 * Run: npx tsx scripts/scrape-uitagenda-events.ts
 *
 * Options:
 *   --dry-run    Preview without inserting
 *   --delay N    Delay between requests in ms (default: 1000)
 *   --no-cache   Always hit DB for duplicate checks (cache file still updated at end)
 *   --query      Comma-separated search terms (default: fotografie,foto)
 */

import {
  createScraperSupabase,
  delay,
  filterThisWeek,
  findDuplicate,
  mapCategory,
  parseArgs,
  processEvents,
  type ScrapedEvent,
} from './scraper-utils';

const BASE_URL = 'https://www.uitagendarotterdam.nl';
const API_URL = `${BASE_URL}/umbraco/surface/ajax/search`;

interface UitagendaDateEntry {
  dateBeautified?: string;
  timeBeautified?: string;
  soldout?: boolean;
  url?: string;
  location?: string;
  locationUrl?: string;
  ticketUrl?: string;
  productionTitle?: string;
  productionText?: string;
  productionUrl?: string;
  productionImage?: string;
}

interface UitagendaItem {
  id: number;
  title: string;
  textShort?: string;
  date?: string;
  dateEnd?: string;
  dates?: UitagendaDateEntry[];
  singleDayEvent?: boolean;
  location?: {
    title?: string;
    city?: string;
    address?: string;
  };
  url?: string;
  image?: string;
  key?: string;
  genres?: Array<{ title?: string }>;
  productionDateRange?: { dateFrom?: string; dateTo?: string };
}

interface UitagendaResponse {
  pagedList?: {
    items: UitagendaItem[];
    paginator?: {
      totalPages: number;
      currentPage: number;
    };
  };
}

function parseTimeRange(timeBeautified: string | undefined): {
  start_time: string | null;
  end_time: string | null;
} {
  if (!timeBeautified?.trim()) return { start_time: null, end_time: null };
  // e.g. "14:30 - 15:30" or "19:15 - 22:15"
  const match = timeBeautified.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return { start_time: null, end_time: null };
  return {
    start_time: `${match[1].padStart(2, '0')}:${match[2]}:00`,
    end_time: `${match[3].padStart(2, '0')}:${match[4]}:00`,
  };
}

function parseDateFromUrl(dateUrl: string): string | null {
  // e.g. "/agenda/fotokids-.../08-04-2026-1430/" -> "2026-04-08"
  const m = dateUrl.match(/(\d{2})-(\d{2})-(\d{4})-\d+\/?$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function itemToScrapedEvents(item: UitagendaItem): ScrapedEvent[] {
  const title = item.title?.trim();
  const locationTitle = item.location?.title?.trim();
  const locationCity = item.location?.city?.trim();
  const url = item.url?.trim();

  if (!title || !locationTitle || !locationCity || !url) return [];

  const genreTitle = item.genres?.[0]?.title;
  const category = mapCategory(genreTitle ?? 'other');
  const imageUrl = item.image
    ? (item.image.startsWith('http') ? item.image : `${BASE_URL}${item.image}`)
    : null;
  let price_info: string | null = null;
  const hasGratis = item.genres?.some((g) => g.title?.toLowerCase() === 'gratis');
  if (hasGratis) price_info = 'Gratis';
  const description = item.textShort?.trim() || null;
  const locationAddress = item.location?.address?.trim() || null;

  const dateEntries = item.dates ?? [];
  const parsedEntries = dateEntries
    .map((entry) => ({ entry, date: entry.url ? parseDateFromUrl(entry.url) : null }))
    .filter((e): e is { entry: UitagendaDateEntry; date: string } => e.date != null);

  if (parsedEntries.length > 1) {
    const sorted = [...parsedEntries].sort((a, b) => a.date.localeCompare(b.date));

    // Group consecutive dates (no gap > 1 day) into spans
    const groups: typeof sorted[] = [];
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date);
      const curr = new Date(sorted[i].date);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) {
        current.push(sorted[i]);
      } else {
        groups.push(current);
        current = [sorted[i]];
      }
    }
    groups.push(current);

    if (groups.length > 1) {
      const events: ScrapedEvent[] = [];
      for (const group of groups) {
        const first = group[0];
        const last = group[group.length - 1];
        const { start_time, end_time } = parseTimeRange(first.entry.timeBeautified);
        const entryUrl = first.entry.url
          ? (first.entry.url.startsWith('http') ? first.entry.url : `${BASE_URL}${first.entry.url}`)
          : (url.startsWith('http') ? url : `${BASE_URL}${url}`);

        events.push({
          title,
          description,
          category,
          start_date: first.date,
          end_date: group.length > 1 ? last.date : null,
          start_time,
          end_time,
          location_name: locationTitle,
          location_city: locationCity,
          location_address: locationAddress,
          url: entryUrl,
          image_url: imageUrl,
          organizer: null,
          price_info,
        });
      }
      return events;
    }
  }

  let start_date = '';
  let end_date: string | null = null;

  if (item.productionDateRange?.dateFrom) {
    start_date = item.productionDateRange.dateFrom.slice(0, 10);
    if (item.productionDateRange.dateTo) {
      end_date = item.productionDateRange.dateTo.slice(0, 10);
    }
  } else if (item.date) {
    start_date = item.date.slice(0, 10);
    if (item.dateEnd) {
      end_date = item.dateEnd.slice(0, 10);
    }
  } else {
    return [];
  }

  const { start_time, end_time } = parseTimeRange(dateEntries[0]?.timeBeautified);
  const eventUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  return [{
    title,
    description,
    category,
    start_date,
    end_date,
    start_time,
    end_time,
    location_name: locationTitle,
    location_city: locationCity,
    location_address: locationAddress,
    url: eventUrl,
    image_url: imageUrl,
    organizer: null,
    price_info,
  }];
}

async function fetchPage(
  query: string,
  page: number,
): Promise<{ items: UitagendaItem[]; totalPages: number }> {
  const params = new URLSearchParams({
    culture: 'nl-NL',
    q: query,
    type: 'agenda',
    p: String(page),
  });
  const url = `${API_URL}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = (await res.json()) as UitagendaResponse;
  const items = data.pagedList?.items ?? [];
  const totalPages = data.pagedList?.paginator?.totalPages ?? 1;
  return { items, totalPages };
}

async function fetchAllEvents(
  queries: string[],
  delayMs: number,
): Promise<ScrapedEvent[]> {
  const seenIds = new Set<number>();
  const events: ScrapedEvent[] = [];

  let firstFetch = true;
  for (const query of queries) {
    const q = query.trim();
    if (!q) continue;

    let page = 1;

    // Fetch until we get an empty page (API may under-report totalPages)
    while (true) {
      if (!firstFetch) await delay(delayMs);
      firstFetch = false;

      const { items } = await fetchPage(q, page);

      for (const item of items) {
        if (item.id && seenIds.has(item.id)) continue;
        if (item.id) seenIds.add(item.id);

        const expanded = itemToScrapedEvents(item);
        events.push(...expanded);
      }

      if (items.length === 0) break;
      page++;
    }
  }

  return events;
}

function extractPriceFromDetailPage(html: string): string | null {
  const ldMatch = html.match(
    /<script\s+type="application\/ld\+json">\s*(\{[\s\S]*?\})\s*<\/script>/,
  );
  if (!ldMatch) return null;

  try {
    const cleaned = ldMatch[1]
      .replace(/,\s*}/g, '}')
      .replace(/availability:\s*https?:\/\/[^\s,}]+/g, '"availability": ""');
    const ld = JSON.parse(cleaned);
    if (ld?.offers?.price != null) {
      const price = Number(ld.offers.price);
      const currency = ld.offers.priceCurrency ?? 'EUR';
      if (price === 0) return 'Gratis';
      return `€${price.toFixed(2).replace('.', ',')}${currency !== 'EUR' ? ` ${currency}` : ''}`;
    }
  } catch {
    // malformed JSON-LD
  }
  return null;
}

function getProductionUrl(eventUrl: string): string {
  // Individual date URLs look like /agenda/event-slug/08-04-2026-1430/
  // Production URL is /agenda/event-slug/
  const m = eventUrl.match(/(\/agenda\/[^/]+\/)\d{2}-\d{2}-\d{4}-\d+\/?$/);
  return m ? `${BASE_URL}${m[1]}` : eventUrl;
}

async function enrichPrices(
  events: ScrapedEvent[],
  delayMs: number,
): Promise<ScrapedEvent[]> {
  const enriched = events.map((ev) => ({ ...ev }));
  const priceCache = new Map<string, string | null>();
  let fetchCount = 0;

  for (let i = 0; i < enriched.length; i++) {
    const ev = enriched[i]!;
    if (ev.price_info) continue;
    if (!ev.url?.startsWith('http')) continue;

    const productionUrl = getProductionUrl(ev.url);

    if (priceCache.has(productionUrl)) {
      const cached = priceCache.get(productionUrl)!;
      if (cached) enriched[i]!.price_info = cached;
      continue;
    }

    fetchCount++;
    if (fetchCount === 1 || fetchCount % 10 === 0) {
      process.stdout.write(`\r[Uitagenda] Fetching price from detail page ${fetchCount}...`);
    }

    try {
      if (fetchCount > 1) await delay(delayMs);
      const res = await fetch(productionUrl);
      if (res.ok) {
        const html = await res.text();
        const price = extractPriceFromDetailPage(html);
        priceCache.set(productionUrl, price);
        if (price) enriched[i]!.price_info = price;
      } else {
        priceCache.set(productionUrl, null);
      }
    } catch {
      priceCache.set(productionUrl, null);
    }
  }

  if (fetchCount > 0) process.stdout.write('\n');
  console.log(`[Uitagenda] Fetched ${fetchCount} unique detail pages for prices`);
  return enriched;
}

async function main() {
  const options = parseArgs({ delayMs: 1000 });
  const args = process.argv.slice(2);
  const queryIdx = args.indexOf('--query');
  const queryStr =
    queryIdx >= 0 && args[queryIdx + 1]
      ? args[queryIdx + 1]
      : 'fotografie,foto';
  const queries = queryStr.split(',').map((q) => q.trim()).filter(Boolean);

  if (queries.length === 0) {
    console.error('At least one search query is required');
    process.exit(1);
  }

  console.log(`\n[Uitagenda] Fetching events for queries: ${queries.join(', ')}\n`);

  const supabase = createScraperSupabase();
  let events = await fetchAllEvents(queries, options.delayMs);

  console.log(`[Uitagenda] Fetched ${events.length} events`);

  if (options.thisWeek) {
    events = filterThisWeek(events);
    console.log(`[Uitagenda] Filtered to ${events.length} events starting this week`);
  }

  if (!options.updateExisting) {
    const beforeCount = events.length;
    const newEvents: ScrapedEvent[] = [];
    for (const event of events) {
      const dup = await findDuplicate(supabase, event);
      if (!dup) newEvents.push(event);
    }
    events = newEvents;
    console.log(`[Uitagenda] Filtered out ${beforeCount - events.length} duplicates, ${events.length} new events remaining`);
  }

  console.log('[Uitagenda] Enriching prices from detail pages...\n');
  events = await enrichPrices(events, options.delayMs);

  await processEvents(supabase, events, options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
