/**
 * Shared utilities for scene event scraper scripts.
 * All scrapers fetch + map data, then delegate to these functions for
 * duplicate detection, image upload, insertion, and summary.
 *
 * CLI (via parseArgs): --no-cache skips local duplicate cache reads (still saves cache at end).
 */

import { createClient } from '@supabase/supabase-js';
import { encode } from 'blurhash';
import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const BUCKET_NAME = 'event-covers';
const VALID_CATEGORIES = [
  'exhibition',
  'photowalk',
  'talk',
  'workshop',
  'festival',
  'meetup',
  'other',
] as const;
export type SceneEventCategory = (typeof VALID_CATEGORIES)[number];

export interface ScrapedEvent {
  title: string;
  description: string | null;
  category: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location_name: string;
  location_city: string;
  location_address: string | null;
  url: string;
  image_url: string | null;
  organizer: string | null;
  price_info: string | null;
  slug?: string; // optional - some sources provide it (e.g. TPC urlId)
}

export interface ScraperOptions {
  dryRun: boolean;
  userId: string;
  delayMs: number;
  /** When true, update existing events on duplicate instead of skipping */
  updateExisting?: boolean;
  /** When true, only process events starting within the next 7 days */
  thisWeek?: boolean;
  /** When true, do not read local duplicate cache for fast skips (still merges new keys into cache at end) */
  noCache?: boolean;
}

export interface InsertResult {
  status: 'inserted' | 'updated' | 'skipped' | 'failed';
  slug?: string;
  id?: string;
  reason?: string;
}

const FETCH_TIMEOUT_MS = 10000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// CLI & setup
// ---------------------------------------------------------------------------

export function parseArgs(defaults: { delayMs?: number } = {}): ScraperOptions {
  config({ path: '.env.local' });

  const userId = process.env.SCRAPER_USER_ID;
  if (!userId || userId.trim().length === 0) {
    console.error('Missing SCRAPER_USER_ID in .env.local');
    console.error('Create a bot user in Supabase Auth, then set SCRAPER_USER_ID=<uuid>');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const updateExisting = args.includes('--update');
  const thisWeek = args.includes('--this-week');
  const noCache = args.includes('--no-cache');
  const delayIdx = args.indexOf('--delay');
  const delayMs =
    delayIdx >= 0 && args[delayIdx + 1]
      ? parseInt(args[delayIdx + 1], 10)
      : defaults.delayMs ?? 1000;

  return { dryRun, userId: userId.trim(), delayMs, updateExisting, thisWeek, noCache };
}

export function createScraperSupabase(): SupabaseClient {
  config({ path: '.env.local' });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  return createClient(url, key);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function filterThisWeek(events: ScrapedEvent[]): ScrapedEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const filtered = events.filter(
    (e) => e.start_date >= todayStr && e.start_date <= weekEndStr,
  );
  console.log(`[scraper] Filtered to this week (${todayStr} – ${weekEndStr}): ${filtered.length} events`);
  return filtered;
}

// ---------------------------------------------------------------------------
// Slug & category
// ---------------------------------------------------------------------------

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateSlug(title: string, startDate: string, existingSlug?: string): string {
  if (existingSlug && /^[a-z0-9-]+$/.test(existingSlug)) {
    return existingSlug;
  }
  const base = slugify(title);
  const datePart = startDate.replace(/-/g, '');
  return `${base}-${datePart}`;
}

export function generateSlugWithCollision(
  supabase: SupabaseClient,
  title: string,
  startDate: string,
  existingSlug?: string,
  maxAttempts = 5,
): Promise<string> {
  let slug = generateSlug(title, startDate, existingSlug);
  let attempts = 0;

  const tryInsert = async (): Promise<string> => {
    const { data } = await supabase
      .from('scene_events')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return slug;
    attempts++;
    if (attempts >= maxAttempts) {
      return `${generateSlug(title, startDate)}-${randomSuffix()}`;
    }
    slug = `${generateSlug(title, startDate)}-${randomSuffix()}`;
    return tryInsert();
  };
  return tryInsert();
}

// ---------------------------------------------------------------------------
// Local duplicate cache (scripts/.scraper-cache.json)
// ---------------------------------------------------------------------------

const SCRAPER_SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const DUPLICATE_CACHE_PATH = join(SCRAPER_SCRIPTS_DIR, '.scraper-cache.json');

interface DuplicateCacheFileShape {
  known_urls: string[];
  known_title_dates: string[];
}

export interface DuplicateCacheSets {
  knownUrls: Set<string>;
  knownTitleDates: Set<string>;
}

function titleDateCacheKey(event: ScrapedEvent): string {
  return `${slugify(event.title.trim())}|${event.start_date}`;
}

export function loadDuplicateCache(): DuplicateCacheSets {
  if (!existsSync(DUPLICATE_CACHE_PATH)) {
    return { knownUrls: new Set(), knownTitleDates: new Set() };
  }
  try {
    const raw = readFileSync(DUPLICATE_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as DuplicateCacheFileShape;
    const known_urls = Array.isArray(parsed.known_urls) ? parsed.known_urls : [];
    const known_title_dates = Array.isArray(parsed.known_title_dates) ? parsed.known_title_dates : [];
    return {
      knownUrls: new Set(known_urls.map((u) => u.trim()).filter(Boolean)),
      knownTitleDates: new Set(known_title_dates.map((k) => k.trim()).filter(Boolean)),
    };
  } catch {
    console.warn('[scraper] Could not read duplicate cache; starting fresh');
    return { knownUrls: new Set(), knownTitleDates: new Set() };
  }
}

export function saveDuplicateCache(knownUrls: Set<string>, knownTitleDates: Set<string>): void {
  const payload: DuplicateCacheFileShape = {
    known_urls: [...knownUrls].sort(),
    known_title_dates: [...knownTitleDates].sort(),
  };
  writeFileSync(DUPLICATE_CACHE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function isKnownDuplicate(cache: DuplicateCacheSets, event: ScrapedEvent): boolean {
  const url = event.url.trim();
  if (url && cache.knownUrls.has(url)) return true;
  return cache.knownTitleDates.has(titleDateCacheKey(event));
}

/** Record keys for an event so future runs can skip DB duplicate checks. */
export function addEventToDuplicateCache(cache: DuplicateCacheSets, event: ScrapedEvent): void {
  const url = event.url.trim();
  if (url) cache.knownUrls.add(url);
  cache.knownTitleDates.add(titleDateCacheKey(event));
}

/**
 * Merge all non-deleted scene_events into the duplicate cache (URL + title|start_date).
 * One batched read replaces hundreds of per-event findDuplicate queries on full scrapes.
 */
export async function mergeDuplicateCacheFromDatabase(
  supabase: SupabaseClient,
  cache: DuplicateCacheSets,
): Promise<number> {
  const pageSize = 1000;
  let from = 0;
  let total = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('scene_events')
      .select('url, title, start_date')
      .is('deleted_at', null)
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn('[scraper] Could not load scene_events for duplicate cache:', error.message);
      return total;
    }

    const rows = data ?? [];
    for (const row of rows) {
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      if (url) cache.knownUrls.add(url);
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const startDate =
        typeof row.start_date === 'string' ? row.start_date.trim().slice(0, 10) : '';
      if (title && startDate) {
        cache.knownTitleDates.add(`${slugify(title)}|${startDate}`);
      }
    }

    total += rows.length;
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return total;
}

export function mapCategory(raw: string | null | undefined): SceneEventCategory {
  if (!raw) return 'other';
  const lower = raw.toLowerCase().trim();
  const mapping: Record<string, SceneEventCategory> = {
    expo: 'exhibition',
    tentoonstelling: 'exhibition',
    exhibition: 'exhibition',
    workshop: 'workshop',
    cursus: 'workshop',
    masterclass: 'workshop',
    lezing: 'talk',
    webinar: 'talk',
    talk: 'talk',
    photowalk: 'photowalk',
    festival: 'festival',
    meetup: 'meetup',
    'touch & try': 'meetup',
    evenement: 'other',
    event: 'other',
    other: 'other',
  };
  return mapping[lower] ?? 'other';
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

// ---------------------------------------------------------------------------
// Multi-day consolidation
// ---------------------------------------------------------------------------

export function consolidateMultiDayEvents(events: ScrapedEvent[]): ScrapedEvent[] {
  const byKey = new Map<string, ScrapedEvent[]>();

  for (const e of events) {
    const key = `${e.title}|${e.location_name}`;
    const list = byKey.get(key) ?? [];
    list.push(e);
    byKey.set(key, list);
  }

  return Array.from(byKey.values()).flatMap((list) => {
    if (list.length === 1) return [list[0]];

    const sorted = [...list].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );

    // Group consecutive dates (gap <= 1 day) into spans
    const groups: ScrapedEvent[][] = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1].start_date);
      const currDate = new Date(sorted[i].start_date);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 1) {
        groups[groups.length - 1].push(sorted[i]);
      } else {
        groups.push([sorted[i]]);
      }
    }

    return groups.map((group) => {
      const first = group[0];
      const last = group[group.length - 1];
      return {
        ...first,
        start_date: first.start_date,
        end_date: group.length > 1 ? last.start_date : first.end_date ?? null,
        start_time: first.start_time,
        end_time: first.end_time,
      };
    });
  });
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

function normalizeTitleForFuzzy(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? shared / union : 0;
}

export async function findDuplicate(
  supabase: SupabaseClient,
  event: ScrapedEvent,
): Promise<string | null> {
  // 1. Exact URL match
  const { data: byUrl } = await supabase
    .from('scene_events')
    .select('slug')
    .eq('url', event.url.trim())
    .is('deleted_at', null)
    .maybeSingle();
  if (byUrl) return byUrl.slug;

  // 2. Exact title + date
  const { data: byTitleDate } = await supabase
    .from('scene_events')
    .select('slug')
    .ilike('title', event.title.trim())
    .eq('start_date', event.start_date)
    .is('deleted_at', null)
    .maybeSingle();
  if (byTitleDate) return byTitleDate.slug;

  // 3. Fuzzy title + overlapping dates
  const normTitle = normalizeTitleForFuzzy(event.title);
  const startD = new Date(event.start_date);
  const windowStart = new Date(startD);
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date(startD);
  windowEnd.setDate(windowEnd.getDate() + 7);

  const { data: candidates } = await supabase
    .from('scene_events')
    .select('slug, title, start_date')
    .eq('location_city', event.location_city.trim())
    .gte('start_date', windowStart.toISOString().slice(0, 10))
    .lte('start_date', windowEnd.toISOString().slice(0, 10))
    .is('deleted_at', null);

  if (candidates) {
    for (const c of candidates) {
      const normC = normalizeTitleForFuzzy(c.title ?? '');
      const exactTitle = normTitle === normC;
      if (exactTitle) {
        if (c.start_date === event.start_date) return c.slug;
        continue;
      }
      if (normTitle.includes(normC) || normC.includes(normTitle)) return c.slug;
      if (wordOverlap(normTitle, normC) > 0.8) return c.slug;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Image upload (download -> Supabase storage -> blurhash + dimensions)
// ---------------------------------------------------------------------------

function getBlurhashDimensions(
  width: number,
  height: number,
  maxSize = 32,
): { width: number; height: number } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: maxSize, height: maxSize };
  }
  if (width > height) {
    return {
      width: maxSize,
      height: Math.max(1, Math.round((height / width) * maxSize)),
    };
  }
  if (height > width) {
    return {
      width: Math.max(1, Math.round((width / height) * maxSize)),
      height: maxSize,
    };
  }
  return { width: maxSize, height: maxSize };
}

export interface UploadedImageResult {
  publicUrl: string;
  imageBlurhash: string;
  imageWidth: number;
  imageHeight: number;
}

export async function uploadCoverImage(
  supabase: SupabaseClient,
  eventId: string,
  imageUrl: string | null,
): Promise<UploadedImageResult | null> {
  if (!imageUrl?.trim()) return null;

  let absoluteUrl = imageUrl.trim();
  if (!absoluteUrl.startsWith('http')) {
    try {
      absoluteUrl = new URL(imageUrl, 'https://example.com').href;
    } catch {
      return null;
    }
  }

  // images.cmra.nu is a proxy that always serves AVIF; use the original static.cmra.nu URL instead
  const cmraMatch = absoluteUrl.match(/^https?:\/\/images\.cmra\.nu\/(.+)/);
  if (cmraMatch?.[1]) {
    try {
      let decoded = decodeURIComponent(cmraMatch[1]);
      // Strip proxy suffixes like /event-thumbnail
      decoded = decoded.replace(/\/event-thumbnail.*$/, '');
      if (decoded.startsWith('http')) {
        absoluteUrl = decoded;
      }
    } catch {
      // keep original URL
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(absoluteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'image/jpeg,image/png,image/webp,image/gif,*/*;q=0.1' },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    let fileExt = 'jpg';
    if (contentType.includes('png')) fileExt = 'png';
    else if (contentType.includes('webp')) fileExt = 'webp';
    else if (contentType.includes('gif')) fileExt = 'gif';
    else {
      const urlExt = absoluteUrl.split('.').pop()?.split('?')[0];
      if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt.toLowerCase())) {
        fileExt = urlExt.toLowerCase().replace('jpeg', 'jpg');
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1024) return null;

    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const baseMime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
    const mimeSupported = supportedMimeTypes.includes(baseMime);

    let uploadBuffer = Buffer.from(arrayBuffer);
    let uploadContentType = contentType;
    let uploadExt = fileExt;

    if (!mimeSupported) {
      // Retry with strict Accept header to avoid AVIF/HEIF
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), FETCH_TIMEOUT_MS);
      try {
        const retryRes = await fetch(absoluteUrl, {
          signal: retryController.signal,
          headers: { 'User-Agent': USER_AGENT, Accept: 'image/jpeg' },
        });
        if (retryRes.ok) {
          const retryType = retryRes.headers.get('content-type') || '';
          if (retryType.includes('jpeg') || retryType.includes('jpg')) {
            uploadBuffer = Buffer.from(await retryRes.arrayBuffer());
            uploadContentType = 'image/jpeg';
            uploadExt = 'jpg';
          }
        }
      } catch {
        // retry failed, fall through
      } finally {
        clearTimeout(retryTimeout);
      }

      // If retry didn't produce a supported format, skip this image
      const retryMime = uploadContentType.split(';')[0]?.trim().toLowerCase() ?? '';
      if (!supportedMimeTypes.includes(retryMime)) {
        console.warn(`[scraper] Skipping unsupported image format (${baseMime}) for ${eventId}`);
        return null;
      }
    }

    const storagePath = `scene/${eventId}.${uploadExt}`;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, uploadBuffer, {
        cacheControl: '31536000',
        upsert: true,
        contentType: uploadContentType,
      });
    if (error) {
      console.warn(`[scraper] Storage upload failed for ${eventId}:`, error.message);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

    const imageBuffer = uploadBuffer;
    const metadata = await sharp(imageBuffer).metadata();
    const origW = metadata.width || 32;
    const origH = metadata.height || 32;
    const dims = getBlurhashDimensions(origW, origH, 32);

    const { data: rawData, info } = await sharp(imageBuffer)
      .resize(dims.width, dims.height, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const blurhash = encode(
      new Uint8ClampedArray(rawData),
      info.width,
      info.height,
      4,
      4,
    );

    return {
      publicUrl: data.publicUrl,
      imageBlurhash: blurhash,
      imageWidth: origW,
      imageHeight: origH,
    };
  } catch (err) {
    console.warn(`[scraper] Image upload failed for ${eventId}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Insert event
// ---------------------------------------------------------------------------

export async function insertEvent(
  supabase: SupabaseClient,
  event: ScrapedEvent,
  options: ScraperOptions,
): Promise<InsertResult> {
  const dup = await findDuplicate(supabase, event);
  if (dup) {
    if (options.updateExisting) {
      if (options.dryRun) {
        return { status: 'updated', slug: dup, reason: 'dry-run' };
      }
      const category = mapCategory(event.category);
      if (!VALID_CATEGORIES.includes(category)) {
        return { status: 'failed', reason: `invalid category: ${event.category}` };
      }
      const { data: existing, error: fetchErr } = await supabase
        .from('scene_events')
        .select('id, submitted_by')
        .eq('slug', dup)
        .is('deleted_at', null)
        .maybeSingle();
      if (fetchErr || !existing?.id) {
        return { status: 'skipped', slug: dup, reason: `duplicate of ${dup}` };
      }
      if (existing.submitted_by !== options.userId) {
        return { status: 'skipped', slug: dup, reason: 'owned by another user' };
      }
      const updatePayload: Record<string, unknown> = {
        title: event.title.trim(),
        description: event.description?.trim() || null,
        category,
        start_date: event.start_date,
        end_date: event.end_date?.trim() || null,
        start_time: event.start_time?.trim() || null,
        end_time: event.end_time?.trim() || null,
        location_name: event.location_name.trim(),
        location_city: event.location_city.trim(),
        location_address: event.location_address?.trim() || null,
        url: event.url.trim(),
        organizer: event.organizer?.trim() || null,
        price_info: event.price_info?.trim() || null,
      };

      if (event.image_url) {
        const imgResult = await uploadCoverImage(supabase, existing.id, event.image_url);
        if (imgResult) {
          updatePayload.cover_image_url = imgResult.publicUrl;
          updatePayload.image_blurhash = imgResult.imageBlurhash;
          updatePayload.image_width = imgResult.imageWidth;
          updatePayload.image_height = imgResult.imageHeight;
        }
      }

      const { error: updateErr } = await supabase
        .from('scene_events')
        .update(updatePayload)
        .eq('id', existing.id);
      if (updateErr) {
        return { status: 'failed', reason: updateErr.message };
      }
      return { status: 'updated', slug: dup, id: existing.id };
    }
    return { status: 'skipped', slug: dup, reason: `duplicate of ${dup}` };
  }

  const category = mapCategory(event.category);
  if (!VALID_CATEGORIES.includes(category)) {
    return { status: 'failed', reason: `invalid category: ${event.category}` };
  }

  const slug = await generateSlugWithCollision(
    supabase,
    event.title.trim(),
    event.start_date,
    event.slug,
  );

  if (options.dryRun) {
    return { status: 'inserted', slug, reason: 'dry-run' };
  }

  const { data: inserted, error } = await supabase
    .from('scene_events')
    .insert({
      slug,
      title: event.title.trim(),
      description: event.description?.trim() || null,
      category,
      start_date: event.start_date,
      end_date: event.end_date?.trim() || null,
      start_time: event.start_time?.trim() || null,
      end_time: event.end_time?.trim() || null,
      location_name: event.location_name.trim(),
      location_city: event.location_city.trim(),
      location_address: event.location_address?.trim() || null,
      url: event.url.trim(),
      cover_image_url: null,
      organizer: event.organizer?.trim() || null,
      price_info: event.price_info?.trim() || null,
      submitted_by: options.userId,
    })
    .select('id, slug')
    .single();

  if (error) {
    return { status: 'failed', reason: error.message };
  }

  if (event.image_url && inserted?.id) {
    const imgResult = await uploadCoverImage(supabase, inserted.id, event.image_url);
    if (imgResult) {
      await supabase
        .from('scene_events')
        .update({
          cover_image_url: imgResult.publicUrl,
          image_blurhash: imgResult.imageBlurhash,
          image_width: imgResult.imageWidth,
          image_height: imgResult.imageHeight,
        })
        .eq('id', inserted.id);
    }
  }

  return {
    status: 'inserted',
    slug: inserted?.slug,
    id: inserted?.id,
  };
}

// ---------------------------------------------------------------------------
// Process events & summary
// ---------------------------------------------------------------------------

export async function processEvents(
  supabase: SupabaseClient,
  events: ScrapedEvent[],
  options: ScraperOptions,
): Promise<InsertResult[]> {
  const runStartTimestamp = new Date().toISOString();
  console.log(`\n[scraper] Run started at: ${runStartTimestamp}`);
  console.log(`[scraper] Events to process: ${events.length}`);
  if (options.dryRun) console.log('[scraper] DRY RUN - no changes will be made\n');

  let consolidated = consolidateMultiDayEvents(events);
  console.log(`[scraper] After multi-day consolidation: ${consolidated.length} events`);

  if (options.thisWeek) {
    consolidated = filterThisWeek(consolidated);
  }
  console.log();

  const duplicateCache = loadDuplicateCache();
  if (options.noCache) {
    console.log('[scraper] --no-cache: duplicate checks always hit the database (cache file still updated at end)\n');
  } else {
    const fromFileUrls = duplicateCache.knownUrls.size;
    const fromFileKeys = duplicateCache.knownTitleDates.size;
    const fromDb = await mergeDuplicateCacheFromDatabase(supabase, duplicateCache);
    console.log(
      `[scraper] Duplicate cache: ${fromDb} rows from scene_events + file (${fromFileUrls} urls, ${fromFileKeys} keys) -> ${duplicateCache.knownUrls.size} urls, ${duplicateCache.knownTitleDates.size} title+date keys (${DUPLICATE_CACHE_PATH})\n`,
    );
  }

  const results: InsertResult[] = [];

  function shouldPersistEventInCache(result: InsertResult): boolean {
    if (result.status === 'failed') return false;
    if (result.status === 'skipped' && result.reason === 'cached duplicate') return false;
    if (result.status === 'inserted' && options.dryRun) return false;
    return result.status === 'inserted' || result.status === 'updated' || result.status === 'skipped';
  }

  for (let i = 0; i < consolidated.length; i++) {
    const e = consolidated[i];
    console.log(`[${i + 1}/${consolidated.length}] ${e.title} (${e.start_date})`);

    if (!options.noCache && isKnownDuplicate(duplicateCache, e)) {
      results.push({ status: 'skipped', reason: 'cached duplicate' });
      console.log('  -> skipped (cached duplicate)');
    } else {
      const result = await insertEvent(supabase, e, options);
      results.push(result);

      if (shouldPersistEventInCache(result)) {
        addEventToDuplicateCache(duplicateCache, e);
      }

      if (result.status === 'inserted') {
        console.log(`  -> inserted ${result.slug ?? result.id ?? ''}`);
      } else if (result.status === 'updated') {
        console.log(`  -> updated ${result.slug ?? result.id ?? ''}`);
      } else if (result.status === 'skipped') {
        console.log(`  -> skipped (${result.reason})`);
      } else {
        console.log(`  -> failed: ${result.reason}`);
      }
    }

    if (i < consolidated.length - 1) {
      const last = results[results.length - 1];
      if (last?.reason !== 'cached duplicate') {
        await delay(options.delayMs);
      }
    }
  }

  saveDuplicateCache(duplicateCache.knownUrls, duplicateCache.knownTitleDates);
  console.log(`[scraper] Duplicate cache saved (${duplicateCache.knownUrls.size} urls, ${duplicateCache.knownTitleDates.size} title+date keys)\n`);

  printSummary(results, options, runStartTimestamp);

  const inserted = results.filter((r) => r.status === 'inserted');
  const updated = results.filter((r) => r.status === 'updated');
  if ((inserted.length > 0 || updated.length > 0) && !options.dryRun) {
    // Prefer SCRAPER_REVALIDATE_URL so local scraper runs can ping production (NEXT_PUBLIC_SITE_URL is often localhost).
    const baseUrl = (
      process.env.SCRAPER_REVALIDATE_URL?.trim()
      || process.env.NEXT_PUBLIC_SITE_URL?.trim()
      || 'http://localhost:3000'
    );
    const secret = process.env.REVALIDATION_SECRET;
    if (secret) {
      try {
        const url = `${baseUrl.replace(/\/$/, '')}/api/revalidate-all?secret=${encodeURIComponent(secret)}`;
        const res = await fetch(url);
        if (res.ok) {
          console.log(`[scraper] Cache revalidated (${new URL(url).origin})`);
        } else {
          console.warn('[scraper] Revalidation failed:', res.status, new URL(url).origin);
        }
      } catch (err) {
        console.warn('[scraper] Revalidation request failed:', err instanceof Error ? err.message : err);
      }
    } else {
      console.log(
        '[scraper] Tip: Set REVALIDATION_SECRET (+ SCRAPER_REVALIDATE_URL for prod when scraping locally) to refresh the site cache after inserts',
      );
    }
  }

  return results;
}

export function printSummary(
  results: InsertResult[],
  options: ScraperOptions,
  runStartTimestamp: string,
): void {
  const inserted = results.filter((r) => r.status === 'inserted');
  const updated = results.filter((r) => r.status === 'updated');
  const skipped = results.filter((r) => r.status === 'skipped');
  const failed = results.filter((r) => r.status === 'failed');

  const cachedLocalSkips = skipped.filter((r) => r.reason === 'cached duplicate').length;

  console.log('\n--- Summary ---');
  console.log(`Inserted: ${inserted.length}`);
  if (updated.length > 0) console.log(`Updated: ${updated.length}`);
  console.log(`Skipped (duplicate): ${skipped.length}`);
  if (cachedLocalSkips > 0) {
    console.log(
      `  (${cachedLocalSkips} via local cache, ${skipped.length - cachedLocalSkips} after database check)`,
    );
  }
  console.log(`Failed: ${failed.length}`);
  console.log(`Run timestamp: ${runStartTimestamp}`);

  if (inserted.length > 0 && !options.dryRun) {
    console.log('\nInserted event slugs:');
    inserted.forEach((r) => console.log(`  - ${r.slug ?? r.id ?? '?'}`));
  }
}
