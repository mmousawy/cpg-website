/**
 * Scrape photography events from Cameranu events overview (HTML + JSON-LD).
 * Run: npx tsx scripts/scrape-cameranu-events.ts
 *
 * Options:
 *   --dry-run          Preview without inserting
 *   --delay N          Delay between requests in ms (default: 1000)
 *   --no-detail-images Skip fetching event detail pages for hero/masonry images (use overview thumbnails only)
 */

import { execSync } from 'node:child_process';
import {
  createScraperSupabase,
  decodeHtmlEntities,
  delay,
  filterThisWeek,
  mapCategory,
  parseArgs,
  processEvents,
  stripHtml,
  type ScrapedEvent,
} from './scraper-utils';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BASE_URL = 'https://www.cameranu.nl';
const OVERVIEW_URL = `${BASE_URL}/events/overzicht`;

interface SchemaAddress {
  streetAddress?: string;
  addressLocality?: string;
  postalCode?: string;
}

interface SchemaLocation {
  name?: string;
  address?: SchemaAddress;
}

interface SchemaEvent {
  '@type'?: string;
  name?: string;
  description?: string;
  image?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  location?: SchemaLocation;
  offers?: { price?: number; priceCurrency?: string };
  isAccessibleForFree?: boolean;
}

interface SchemaItemList {
  '@type'?: string;
  url?: string;
  itemListElement?: SchemaEvent[];
}

function extractEventTypeBeforeScript(html: string, scriptStartIndex: number): string {
  const before = html.slice(0, scriptStartIndex);
  const match = before.match(/event-card__type">([^<]+)<\/div>/g);
  if (!match?.length) return 'other';
  const last = match[match.length - 1];
  const m = last.match(/event-card__type">([^<]+)<\/div>/);
  return m ? m[1].trim() : 'other';
}

function extractThumbnailBeforeScript(html: string, scriptStartIndex: number): string | null {
  const before = html.slice(0, scriptStartIndex);
  const regex = /event-card__thumbnail[\s\S]*?<img[^>]+src="([^"]+)"/g;
  let match;
  let last: string | null = null;
  while ((match = regex.exec(before)) !== null) last = match[1];
  return last?.trim() ?? null;
}

/** Extract cover image from event detail page: .event-view-hero__bg img or .event-view-impression-images__masonry img */
function extractImageFromDetailPage(html: string): string | null {
  const heroMatch = html.match(/event-view-hero__bg[\s\S]*?<img[^>]+src="([^"]+)"/);
  if (heroMatch?.[1]) return heroMatch[1].trim();

  const masonryMatch = html.match(/event-view-impression-images__masonry[\s\S]*?<img[^>]+src="([^"]+)"/);
  if (masonryMatch?.[1]) return masonryMatch[1].trim();

  return null;
}

function toAbsoluteImageUrl(src: string): string {
  const s = src.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${BASE_URL}${s}`;
  return `${BASE_URL}/${s}`;
}

function parseEventsFromHtml(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const scriptRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonStr = match[1].trim();
    const scriptStartIndex = match.index;

    let data: SchemaItemList;
    try {
      data = JSON.parse(jsonStr) as SchemaItemList;
    } catch {
      continue;
    }

    if (data['@type'] !== 'ItemList' || !Array.isArray(data.itemListElement)) continue;

    const eventType = extractEventTypeBeforeScript(html, scriptStartIndex);
    const category = mapCategory(eventType);
    const listUrl = data.url ?? '';
    let baseUrl = listUrl.startsWith('http')
      ? listUrl
      : listUrl
        ? `${BASE_URL}${listUrl.replace(/#.*$/, '')}`
        : '';
    if (!baseUrl && data.itemListElement?.[0]) {
      const firstUrl = (data.itemListElement[0] as SchemaEvent).url ?? '';
      baseUrl = firstUrl ? `${BASE_URL}${String(firstUrl).replace(/#.*$/, '')}` : '';
    }

    const thumbnailUrl = extractThumbnailBeforeScript(html, scriptStartIndex);

    for (const el of data.itemListElement) {
      const ev = el as SchemaEvent;
      if (ev['@type'] !== 'Event' || !ev.name) continue;

      const loc = ev.location;
      const locName = loc?.name?.trim() ?? '';
      const addr = loc?.address;
      const city = addr?.addressLocality?.trim() ?? '';
      const addressParts = [addr?.streetAddress, addr?.postalCode].filter(Boolean);
      const location_address = addressParts.length > 0 ? addressParts.join(', ') : null;

      if (!locName || !city) continue;

      let start_date = '';
      let start_time: string | null = null;
      let end_date: string | null = null;
      let end_time: string | null = null;

      if (ev.startDate) {
        const start = new Date(ev.startDate);
        start_date = start.toISOString().slice(0, 10);
        start_time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}:00`;
      }
      if (!start_date) continue;

      if (ev.endDate) {
        const end = new Date(ev.endDate);
        const endDateStr = end.toISOString().slice(0, 10);
        if (endDateStr !== start_date) {
          end_date = endDateStr;
        }
        end_time = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:00`;
      }

      const eventUrl = ev.url
        ? (ev.url.startsWith('http') ? ev.url : `${BASE_URL}/${ev.url.replace(/^\//, '')}`)
        : baseUrl;
      const imageUrl = thumbnailUrl ?? (ev.image
        ? (ev.image.startsWith('http') ? ev.image : `${BASE_URL}${ev.image}`)
        : null);

      let price_info: string | null = null;
      if (ev.isAccessibleForFree) {
        const desc = ev.description ? stripHtml(ev.description) : '';
        const adminMatch = desc.match(/administratiekosten\s+(?:van\s+)?€?([\d,]+)/i)
          ?? desc.match(/€([\d,]+)[^.]*administratiekosten/i);
        const adminAmount = adminMatch ? adminMatch[1].replace(',', '.') : null;
        const adminStr = adminAmount ? `€${adminAmount.replace('.', ',')}` : '€2,95';
        price_info = `Free (${adminStr} admin fee)`;
      } else if (ev.offers?.price != null) {
        price_info = `€${ev.offers.price}${ev.offers.priceCurrency ? ` ${ev.offers.priceCurrency}` : ''}`;
      }

      events.push({
        title: decodeHtmlEntities(ev.name),
        description: ev.description ? stripHtml(ev.description) || null : null,
        category,
        start_date,
        end_date,
        start_time,
        end_time,
        location_name: locName,
        location_city: city,
        location_address,
        url: eventUrl,
        image_url: imageUrl,
        organizer: 'Cameranu',
        price_info,
      });
    }
  }

  return events;
}

const CURL_MAX_TIME = 30; // seconds per request

function fetchWithCurl(url: string): string {
  try {
    return execSync(
      `curl -sL --max-time ${CURL_MAX_TIME} --connect-timeout 10 -H "User-Agent: ${USER_AGENT.replace(/"/g, '\\"')}" "${url}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Curl fetch failed for ${url}: ${msg}`);
  }
}

async function fetchPage(page: number): Promise<string> {
  const url = `${OVERVIEW_URL}?sort=Startdatum+oplopend&page=${page}`;
  return fetchWithCurl(url);
}

/** Fetch each event's detail page and use .event-view-hero__bg or .event-view-impression-images__masonry img as cover */
async function enrichEventImages(
  events: ScrapedEvent[],
  delayMs: number,
): Promise<ScrapedEvent[]> {
  const enriched: ScrapedEvent[] = events.map((ev) => ({ ...ev }));
  const total = events.length;
  for (let i = 0; i < total; i++) {
    const ev = enriched[i]!;
    const detailUrl = ev.url;
    if (i === 0 || (i + 1) % 20 === 0 || i === total - 1) {
      process.stdout.write(`\r[Cameranu] Enriched ${i + 1}/${total} detail pages...`);
    }
    if (!detailUrl?.startsWith('http')) continue;
    try {
      const html = fetchWithCurl(detailUrl);
      const src = extractImageFromDetailPage(html);
      if (src) {
        enriched[i]!.image_url = toAbsoluteImageUrl(src);
      }
    } catch {
      // keep overview image on fetch error
    }
    if (i < total - 1) await delay(delayMs);
  }
  process.stdout.write('\n');
  return enriched;
}

async function fetchAllEvents(delayMs: number): Promise<ScrapedEvent[]> {
  const allEvents: ScrapedEvent[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const html = await fetchPage(page);
    const events = parseEventsFromHtml(html);
    allEvents.push(...events);

    if (events.length === 0) {
      hasMore = false;
    } else {
      page++;
      await delay(delayMs);
    }
  }

  return allEvents;
}

async function main() {
  const options = parseArgs({ delayMs: 1000 });

  console.log('\n[Cameranu] Fetching events from overview pages...\n');

  const supabase = createScraperSupabase();
  let events = await fetchAllEvents(options.delayMs);
  console.log(`[Cameranu] Fetched ${events.length} events`);

  if (options.thisWeek) {
    events = filterThisWeek(events);
  }

  const detailImages = process.argv.includes('--detail-images');
  if (detailImages) {
    console.log(`[Cameranu] Enriching images from ${events.length} detail pages...\n`);
    events = await enrichEventImages(events, options.delayMs);
  } else {
    console.log('[Cameranu] Using overview thumbnails (pass --detail-images for hero images)\n');
  }

  await processEvents(supabase, events, options);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
