/**
 * Scrape photography events from Uitagenda Rotterdam API and insert into scene_events.
 * Run: npx tsx scripts/scrape-uitagenda-events.ts
 *
 * Options:
 *   --dry-run    Preview without inserting
 *   --delay N    Delay between requests in ms (default: 1000)
 *   --query      Comma-separated search terms (default: fotografie,foto)
 */

import {
  createScraperSupabase,
  delay,
  mapCategory,
  parseArgs,
  processEvents,
  type ScrapedEvent,
} from './scraper-utils';

const BASE_URL = 'https://www.uitagendarotterdam.nl';
const API_URL = `${BASE_URL}/umbraco/surface/ajax/search`;

interface UitagendaItem {
  id: number;
  title: string;
  textShort?: string;
  date?: string;
  dateEnd?: string;
  dates?: Array<{ timeBeautified?: string; ticketUrl?: string }>;
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

function itemToScrapedEvent(item: UitagendaItem): ScrapedEvent | null {
  const title = item.title?.trim();
  const locationTitle = item.location?.title?.trim();
  const locationCity = item.location?.city?.trim();
  const url = item.url?.trim();

  if (!title || !locationTitle || !locationCity || !url) return null;

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
    return null;
  }

  const { start_time, end_time } = parseTimeRange(item.dates?.[0]?.timeBeautified);

  const genreTitle = item.genres?.[0]?.title;
  const category = mapCategory(genreTitle ?? 'other');

  const eventUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const imageUrl = item.image
    ? (item.image.startsWith('http') ? item.image : `${BASE_URL}${item.image}`)
    : null;

  // Price: Uitagenda doesn't expose prices in the API. Use "Gratis" only when explicitly marked.
  let price_info: string | null = null;
  const hasGratis = item.genres?.some((g) => g.title?.toLowerCase() === 'gratis');
  if (hasGratis) price_info = 'Gratis';
  // When we don't know, leave null - UI will show "See event" instead of incorrectly "Free"

  return {
    title,
    description: item.textShort?.trim() || null,
    category,
    start_date,
    end_date,
    start_time,
    end_time,
    location_name: locationTitle,
    location_city: locationCity,
    location_address: item.location?.address?.trim() || null,
    url: eventUrl,
    image_url: imageUrl,
    organizer: locationTitle,
    price_info,
  };
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

        const event = itemToScrapedEvent(item);
        if (event) events.push(event);
      }

      if (items.length === 0) break;
      page++;
    }
  }

  return events;
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
  const events = await fetchAllEvents(queries, options.delayMs);

  console.log(`[Uitagenda] Fetched ${events.length} events\n`);

  await processEvents(supabase, events, options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
