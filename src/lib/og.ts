/**
 * Fetches a URL's HTML and extracts the Open Graph or Twitter image URL.
 * Used to auto-populate scene event cover images from the event's website.
 */

import { adminSupabase } from '@/utils/supabase/admin';

const FETCH_TIMEOUT_MS = 5000;
const BUCKET_NAME = 'event-covers';

const USER_AGENT =
  'Mozilla/5.0 (compatible; CPG-Scene/1.0; +https://github.com/example)';

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
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null;
    }

    const html = await response.text();
    const rawImageUrl = extractImageFromHtml(html);
    if (!rawImageUrl) return null;

    const absoluteUrl = resolveImageUrl(rawImageUrl, url);
    return isValidImageUrl(absoluteUrl) ? absoluteUrl : null;
  } catch {
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
  const externalUrl = await fetchOgImage(eventUrl);
  if (!externalUrl) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(externalUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
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
    const storagePath = `scene/${eventId}.${fileExt}`;

    const { error } = await adminSupabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, arrayBuffer, {
        cacheControl: '31536000',
        upsert: true,
        contentType,
      });

    if (error) return null;

    const { data } = adminSupabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const [imageBlurhash, dimensions] = await Promise.all([
      import('@/utils/generateBlurhashServer').then((m) =>
        m.generateBlurhashFromBuffer(arrayBuffer),
      ),
      import('@/utils/generateBlurhashServer').then((m) =>
        m.getImageDimensionsFromBuffer(arrayBuffer),
      ),
    ]);

    return {
      publicUrl: data.publicUrl,
      ...(imageBlurhash && { imageBlurhash }),
      ...(dimensions && {
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
      }),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
