/**
 * Scrape photography events from The Photographers Club API and insert into scene_events.
 * Run: npx tsx scripts/scrape-tpc-events.ts
 *
 * Options:
 *   --dry-run    Preview without inserting
 *   --delay N    Delay between requests in ms (default: 1000)
 *   --no-cache   Always hit DB for duplicate checks (cache file still updated at end)
 *   --months N   Number of months to fetch ahead including current (default: 3)
 */

import {
  createScraperSupabase,
  delay,
  mapCategory,
  parseArgs,
  processEvents,
  stripHtml,
  type ScrapedEvent,
} from './scraper-utils';

const BASE_URL = 'https://www.thephotographersclub.com';
const API_URL = `${BASE_URL}/api/open/GetItemsByMonth`;
const COLLECTION_ID = '66814185d3276b1e70d2e706';
const CRUMB = 'BbG0WarGmOPoNjA1OGQ0N2NkYzExZGQ5YTk5ODg5ZDUzZjljYzQ5';

interface TPCLocation {
  addressTitle?: string;
  addressLine1?: string;
  addressLine2?: string;
}

interface TPCItem {
  id: string;
  title?: string;
  excerpt?: string;
  startDate?: number;
  endDate?: number;
  fullUrl?: string;
  assetUrl?: string;
  urlId?: string;
  categories?: string[];
  location?: TPCLocation;
}

function formatMonthYear(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${year}`;
}

function parseAddressLine2(line: string | undefined): string {
  if (!line) return '';
  const part = line.split(',')[0]?.trim();
  return part ?? '';
}

/** Pick timezone from event location - TPC shows times in the event's local timezone */
function getTimezoneForCity(city: string): string {
  const c = city.toLowerCase();
  if (/amsterdam|rotterdam|utrecht|den haag|the hague|eindhoven|groningen|maastricht/i.test(c)) {
    return 'Europe/Amsterdam';
  }
  if (/berlin|hamburg|munich|frankfurt|köln|cologne|düsseldorf/i.test(c)) {
    return 'Europe/Berlin';
  }
  if (/paris|lyon|marseille/i.test(c)) {
    return 'Europe/Paris';
  }
  return 'Europe/London';
}

function itemToScrapedEvent(item: TPCItem): ScrapedEvent | null {
  const title = item.title?.trim();
  const locationTitle = item.location?.addressTitle?.trim();
  const addressLine2 = item.location?.addressLine2;
  const city = parseAddressLine2(addressLine2) || 'Unknown';
  const fullUrl = item.fullUrl?.trim();

  if (!title || !locationTitle || !fullUrl) return null;
  if (!item.startDate) return null;

  const start = new Date(item.startDate);
  const end = item.endDate ? new Date(item.endDate) : null;
  const tz = getTimezoneForCity(city);

  const timeOpts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const startTimeStr = start.toLocaleTimeString('en-GB', timeOpts);
  const start_date = start.toISOString().slice(0, 10);
  const start_time = `${startTimeStr}:00`;
  let end_date: string | null = null;
  let end_time: string | null = null;

  if (end) {
    const endDateStr = end.toLocaleDateString('en-CA', { timeZone: tz });
    if (endDateStr !== start_date) end_date = endDateStr;
    const endTimeStr = end.toLocaleTimeString('en-GB', timeOpts);
    end_time = `${endTimeStr}:00`;
  }

  const category = mapCategory(item.categories?.[0] ?? 'other');
  const eventUrl = fullUrl.startsWith('http') ? fullUrl : `${BASE_URL}${fullUrl}`;

  return {
    title,
    description: item.excerpt ? stripHtml(item.excerpt) || null : null,
    category,
    start_date,
    end_date,
    start_time,
    end_time,
    location_name: locationTitle,
    location_city: city,
    location_address: item.location?.addressLine1?.trim() || null,
    url: eventUrl,
    image_url: item.assetUrl?.trim() || null,
    organizer: 'The Photographers Club',
    price_info: null,
    slug: item.urlId?.trim() || undefined,
  };
}

async function fetchMonth(monthStr: string): Promise<TPCItem[]> {
  const params = new URLSearchParams({
    month: monthStr,
    collectionId: COLLECTION_ID,
    crumb: CRUMB,
  });
  const url = `${API_URL}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = (await res.json()) as TPCItem[];
  return Array.isArray(data) ? data : [];
}

async function fetchAllEvents(
  monthsAhead: number,
  delayMs: number,
): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];
  const seenIds = new Set<string>();

  const now = new Date();
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthStr = formatMonthYear(d);
    const items = await fetchMonth(monthStr);

    for (const item of items) {
      if (item.id && seenIds.has(item.id)) continue;
      if (item.id) seenIds.add(item.id);

      const event = itemToScrapedEvent(item);
      if (event) events.push(event);
    }

    if (i < monthsAhead - 1) await delay(delayMs);
  }

  return events;
}

async function main() {
  const options = parseArgs({ delayMs: 1000 });
  const args = process.argv.slice(2);
  const monthsIdx = args.indexOf('--months');
  const monthsAhead =
    monthsIdx >= 0 && args[monthsIdx + 1]
      ? parseInt(args[monthsIdx + 1], 10)
      : 3;

  if (monthsAhead < 1) {
    console.error('--months must be at least 1');
    process.exit(1);
  }

  console.log(`\n[TPC] Fetching events for ${monthsAhead} months...\n`);

  const supabase = createScraperSupabase();
  const events = await fetchAllEvents(monthsAhead, options.delayMs);

  console.log(`[TPC] Fetched ${events.length} events\n`);

  await processEvents(supabase, events, options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
