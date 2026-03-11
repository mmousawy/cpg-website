/**
 * Fetches a URL's HTML and extracts the Open Graph or Twitter image URL.
 * Used to auto-populate scene event cover images from the event's website.
 */

import { adminSupabase } from '@/utils/supabase/admin';

const FETCH_TIMEOUT_MS = 5000;
const BUCKET_NAME = 'event-covers';

const USER_AGENT =
  'Mozilla/5.0 (compatible; CPG-Scene/1.0; +https://github.com/example)';

const MIN_IMG_DIMENSION = 200;

function extractImageFromHtml(html: string): string | null {
  // Try og:image - handle both property="og:image" and property='og:image'
  const ogMatch = html.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  );
  if (ogMatch && ogMatch[1]?.trim()) return ogMatch[1].trim();

  // Try twitter:image
  const twitterMatch = html.match(
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  );
  if (twitterMatch && twitterMatch[1]?.trim()) return twitterMatch[1].trim();

  // Fallback: first <img> whose explicit width & height are both >= MIN_IMG_DIMENSION
  const imgRegex = /<img\s[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const src = match[1];
    if (!src || /\.(svg|ico)(\?|$)/i.test(src)) continue;

    const w = tag.match(/width=["']?(\d+)/i);
    const h = tag.match(/height=["']?(\d+)/i);
    if (w && h && Number(w[1]) >= MIN_IMG_DIMENSION && Number(h[1]) >= MIN_IMG_DIMENSION) {
      return src;
    }
  }

  // Last resort: first <img> with a plausible image extension, skipping tiny icons and trackers
  imgRegex.lastIndex = 0;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const src = match[1];
    if (!src) continue;
    if (/\.(svg|ico)(\?|$)/i.test(src)) continue;
    if (/\blogo\b|\bfavicon\b|\bicon\b|\bbadge\b/i.test(src)) continue;
    if (/facebook\.com\/tr|google-analytics|doubleclick\.net|analytics|pixel|beacon/i.test(src)) continue;
    const w = tag.match(/width=["']?(\d+)/i);
    const h = tag.match(/height=["']?(\d+)/i);
    if (w && h && (Number(w[1]) <= 3 || Number(h[1]) <= 3)) continue;
    return src;
  }

  return null;
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveImageUrl(imageUrl: string, baseUrl: string): string {
  try {
    return new URL(imageUrl, baseUrl).href;
  } catch {
    return imageUrl;
  }
}

/**
 * Fetches the given URL's HTML and extracts the og:image or twitter:image.
 * Returns the absolute image URL, or null if none found or fetch failed.
 */
export async function fetchOgImage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    console.log(`[og] Fetching HTML from ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    console.log(`[og] Response: ${response.status} ${response.statusText} (redirected: ${response.redirected}, url: ${response.url})`);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      console.log(`[og] Skipped: content-type is "${contentType}"`);
      return null;
    }

    const html = await response.text();
    console.log(`[og] HTML length: ${html.length} chars`);

    const rawImageUrl = extractImageFromHtml(html);
    if (!rawImageUrl) {
      console.log('[og] No image URL found in HTML (no og:image, twitter:image, or suitable <img>)');
      return null;
    }

    const absoluteUrl = resolveImageUrl(rawImageUrl, url);
    console.log(`[og] Extracted image URL: ${absoluteUrl}`);

    if (!isValidImageUrl(absoluteUrl)) {
      console.log(`[og] Invalid image URL: ${absoluteUrl}`);
      return null;
    }

    return absoluteUrl;
  } catch (err) {
    console.error(`[og] Failed to fetch HTML from ${url}:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type OgImageResult = {
  publicUrl: string;
  imageBlurhash?: string;
  imageWidth?: number;
  imageHeight?: number;
};

/**
 * Fetches the OG image URL, downloads the image, uploads to Supabase storage,
 * generates blurhash and dimensions, and returns the result. Returns null if any step fails.
 */
export async function downloadAndUploadOgImage(
  eventId: string,
  eventUrl: string,
): Promise<OgImageResult | null> {
  console.log(`[og] downloadAndUploadOgImage: eventId=${eventId}, url=${eventUrl}`);
  const externalUrl = await fetchOgImage(eventUrl);
  if (!externalUrl) {
    console.log('[og] No image URL found, skipping download');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    console.log(`[og] Downloading image from ${externalUrl}`);
    const response = await fetch(externalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`[og] Image download failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.log(`[og] Skipped: downloaded content-type is "${contentType}", not an image`);
      return null;
    }
    let fileExt = 'jpg';
    if (contentType.includes('png')) fileExt = 'png';
    else if (contentType.includes('webp')) fileExt = 'webp';
    else if (contentType.includes('gif')) fileExt = 'gif';
    else {
      const urlExt = externalUrl.split('.').pop()?.split('?')[0];
      if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(urlExt.toLowerCase())) {
        fileExt = urlExt.toLowerCase().replace('jpeg', 'jpg');
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`[og] Downloaded ${arrayBuffer.byteLength} bytes (${contentType})`);

    if (arrayBuffer.byteLength < 1024) {
      console.log(`[og] Skipped: image too small (${arrayBuffer.byteLength} bytes), likely a tracking pixel`);
      return null;
    }

    const storagePath = `scene/${eventId}.${fileExt}`;

    const { error } = await adminSupabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, arrayBuffer, {
        cacheControl: '31536000',
        upsert: true,
        contentType,
      });

    if (error) {
      console.error('[og] Storage upload failed:', error.message);
      return null;
    }

    const { data } = adminSupabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    console.log(`[og] Uploaded to ${data.publicUrl}`);

    const [imageBlurhash, dimensions] = await Promise.all([
      import('@/utils/generateBlurhashServer').then((m) =>
        m.generateBlurhashFromBuffer(arrayBuffer),
      ),
      import('@/utils/generateBlurhashServer').then((m) =>
        m.getImageDimensionsFromBuffer(arrayBuffer),
      ),
    ]);

    console.log(`[og] Blurhash: ${imageBlurhash ?? 'none'}, dimensions: ${dimensions ? `${dimensions.width}x${dimensions.height}` : 'none'}`);

    return {
      publicUrl: data.publicUrl,
      ...(imageBlurhash && { imageBlurhash }),
      ...(dimensions && {
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
      }),
    };
  } catch (err) {
    console.error('[og] Image download/upload failed:', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
